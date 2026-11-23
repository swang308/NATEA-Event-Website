import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getProfileEmailRecipient, sendBrevoEmail, sendPaymentConfirmedEmail, sendPaymentReportedEmail } from "@/lib/brevo";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const body = await request.json() as { action?: unknown; rsvpId?: unknown };
  const action = body.action === "mark-sent" || body.action === "confirm" || body.action === "refund" ? body.action : null;
  if (!action || typeof body.rsvpId !== "string") {
    return NextResponse.json({ error: "Invalid payment action." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: rsvp, error: rsvpError } = await supabase
    .from("rsvps")
    .select("id, user_id, payment_status, plus_ones, plus_one_name, stripe_payment_intent_id, event_id, events(organizer_id, title, price_cad, starts_at, location, location_type, etransfer_email, payment_deadline)")
    .eq("id", body.rsvpId)
    .eq("event_id", id)
    .single();
  if (rsvpError || !rsvp) return NextResponse.json({ error: "RSVP not found." }, { status: 404 });

  const eventInfo = Array.isArray(rsvp.events) ? rsvp.events[0] : rsvp.events;
  const organizerId = eventInfo?.organizer_id;
  const nextStatus = action === "mark-sent" ? "pending" : action === "refund" ? "refunded" : "paid";
  const allowed = action === "mark-sent"
    ? rsvp.user_id === user.id && rsvp.user_id !== organizerId && rsvp.payment_status === "unpaid"
    : action === "refund"
      ? organizerId === user.id && rsvp.user_id !== user.id && ["paid", "cancel_requested"].includes(rsvp.payment_status)
      : organizerId === user.id && rsvp.user_id !== user.id && ["unpaid", "pending"].includes(rsvp.payment_status);

  if (!allowed) return NextResponse.json({ error: "You are not allowed to perform this payment action." }, { status: 403 });

  const paymentUpdate = action === "confirm"
    ? { payment_status: nextStatus, paid_at: new Date().toISOString() }
    : action === "refund"
      ? { payment_status: nextStatus, paid_at: null }
      : { payment_status: nextStatus };
  const { error } = await supabase.from("rsvps").update(paymentUpdate).eq("id", rsvp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // If this was a Stripe card payment, refund the card too, minus the Stripe fee.
  // Stripe keeps its 2.9% + $0.30 fee on refunds, so we refund total - fee.
  // $40 ticket -> $38.54 back, $80 guest ticket -> $77.38 back.
  if (action === "refund" && rsvp.stripe_payment_intent_id) {
    try {
      const totalCents = (eventInfo?.price_cad ?? 0) * 100 * (1 + (rsvp.plus_ones ?? 0));
      const feeCents = Math.round(totalCents * 0.029 + 30);
      const refundAmountCents = totalCents - feeCents;
      await stripe.refunds.create({
        payment_intent: rsvp.stripe_payment_intent_id,
        amount: refundAmountCents,
      });
    } catch (refundError) {
      console.error("Stripe refund failed:", refundError);
    }
  }

  if (action === "refund") {
    try {
      const { promoteNextWaitlisted } = await import("@/lib/waitlist");
      await promoteNextWaitlisted(id);
    } catch (promoteError) {
      console.error("Waitlist promotion failed:", promoteError);
    }
  }

  if (action === "mark-sent") {
    const organizer = await getProfileEmailRecipient(organizerId);
    const attendee = await supabase.from("profiles").select("display_name").eq("id", rsvp.user_id).maybeSingle();
    const eventTitle = eventInfo?.title || "NATEA event";
    if (organizer) {
      try {
        await sendPaymentReportedEmail({
          toEmail: organizer.email,
          toName: organizer.name ?? "there",
          attendeeName: attendee.data?.display_name || "An attendee",
          eventTitle,
          eventDate: eventInfo?.starts_at
            ? new Date(eventInfo.starts_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short" })
            : "",
          totalCents: (eventInfo?.price_cad ?? 0) * 100 * (1 + (rsvp.plus_ones ?? 0)),
          guestName: rsvp.plus_ones > 0 ? rsvp.plus_one_name : null,
          deadline: eventInfo?.payment_deadline
            ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(new Date(eventInfo.payment_deadline))
            : "the event deadline",
          reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/en/my-events`,
        });
      } catch (emailError) {
        console.error("Payment confirmation email failed.", emailError);
      }
    }
  }

  if (action === "confirm") {
    try {
      const recipient = await getProfileEmailRecipient(rsvp.user_id);
      if (recipient) {
        await sendPaymentConfirmedEmail({
          toEmail: recipient.email,
          toName: recipient.name ?? "there",
          eventTitle: eventInfo?.title ?? "NATEA event",
          eventDate: eventInfo?.starts_at
            ? new Date(eventInfo.starts_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short" })
            : "",
          eventLocation: eventInfo?.location_type === "online" ? "Online" : (eventInfo?.location ?? ""),
          eventUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/en/events/${id}`,
          totalCents: (eventInfo?.price_cad ?? 0) * 100 * (1 + (rsvp.plus_ones ?? 0)),
          guestName: rsvp.plus_ones > 0 ? rsvp.plus_one_name : null,
        });
      }
    } catch (emailError) {
      console.error("Payment confirmation email failed:", emailError);
    }
  }

  return NextResponse.json({ ok: true, paymentStatus: nextStatus });
}
