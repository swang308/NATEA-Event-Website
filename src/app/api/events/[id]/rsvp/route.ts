import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendRsvpConfirmationEmail } from "@/lib/brevo";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendRefundRequestedEmail } from "@/lib/brevo";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "You must be logged in to RSVP." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { plus_ones?: number; plus_one_name?: string | null };
  const plusOnes = body.plus_ones === 1 ? 1 : 0;
  const plusOneName = typeof body.plus_one_name === "string" ? body.plus_one_name.trim() || null : null;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, location, location_type, organizer_id, price_cad, status, starts_at, capacity")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (eventError || !event || new Date(event.starts_at) <= new Date()) {
    return NextResponse.json({ error: "This event is not available for RSVP." }, { status: 400 });
  }

  const { data: existingRsvps } = await supabase
    .from("rsvps")
    .select("plus_ones, payment_status")
    .eq("event_id", id)
    .neq("payment_status", "refunded");
  const currentCount = (existingRsvps ?? []).reduce(
    (sum, row) => sum + 1 + ((row as { plus_ones?: number | null }).plus_ones ?? 0),
    0
  );
  if (currentCount + 1 + plusOnes > event.capacity) {
    return NextResponse.json({ error: "This event is full." }, { status: 400 });
  }

  const { error } = await supabase.from("rsvps").upsert({
    event_id: event.id,
    user_id: user.id,
    payment_status: event.price_cad === 0 ? "free" : "unpaid",
    plus_ones: plusOnes,
    plus_one_name: plusOneName,
    paid_at: null,
  }, { onConflict: "event_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  try {
    const { data: attendeeProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: organizerProfile } = await adminClient
      .from("profiles")
      .select("email, etransfer_email")
      .eq("id", event.organizer_id)
      .maybeSingle();

    const attendeeEmail = attendeeProfile?.email ?? user.email ?? null;
    if (attendeeEmail) {
      await sendRsvpConfirmationEmail({
        toEmail: attendeeEmail,
        toName: attendeeProfile?.display_name ?? "there",
        eventTitle: event.title,
        eventDate: new Date(event.starts_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short" }),
        eventLocation: event.location_type === "online" ? "Online" : event.location,
        eventUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/en/events/${event.id}`,
        totalCents: event.price_cad * 100 * (1 + plusOnes),
        guestName: plusOnes > 0 ? plusOneName : null,
        etransferEmail: organizerProfile?.etransfer_email ?? organizerProfile?.email ?? null,

      });
    }
  } catch (emailError) {
    console.error("RSVP confirmation email failed:", emailError);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "You must be logged in to cancel an RSVP." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { action?: string; plus_one_name?: string | null; etransfer_email?: string };
  if (body.action !== "request-cancel" && body.action !== "update-guest") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: rsvp, error: rsvpError } = await supabase
    .from("rsvps")
    .select("payment_status, plus_ones")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .single();
  if (rsvpError || !rsvp) return NextResponse.json({ error: "RSVP not found." }, { status: 404 });

  // Edit guest name — no cancel, no payment change
  if (body.action === "update-guest") {
    if (rsvp.plus_ones !== 1) return NextResponse.json({ error: "No guest on this RSVP." }, { status: 400 });
    if (rsvp.payment_status === "paid" || rsvp.payment_status === "pending") {
      const refundEmail = typeof body.etransfer_email === "string" ? body.etransfer_email.trim() : "";
      if (!refundEmail || !refundEmail.includes("@")) return NextResponse.json({ error: "Please enter the e-Transfer email for your refund." }, { status: 400 });
      await supabase.from("profiles").update({ etransfer_email: refundEmail }).eq("id", user.id);
      const { error } = await supabase.from("rsvps").update({ payment_status: "cancel_requested" }).eq("event_id", id).eq("user_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      try {
        const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: event } = await adminClient.from("events").select("title, organizer_id, price_cad, starts_at").eq("id", id).single();
        const { data: attendee } = await adminClient.from("profiles").select("email, display_name").eq("id", user.id).maybeSingle();
        const { data: organizer } = await adminClient.from("profiles").select("email, display_name").eq("id", event?.organizer_id).maybeSingle();
        if (event && organizer?.email) {
          await sendRefundRequestedEmail({
            toEmail: organizer.email, toName: organizer.display_name ?? "there",
            attendeeName: attendee?.display_name ?? "An attendee", attendeeEmail: attendee?.email ?? user.email ?? "",
            refundEmail, eventTitle: event.title,
            eventDate: new Date(event.starts_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short" }),
            amount: `$${event.price_cad * (1 + (rsvp.plus_ones ?? 0))} CAD`,
            reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/en/my-events`,
          });
        }
      } catch (emailError) { console.error("Refund requested email failed:", emailError); }
      return NextResponse.json({ ok: true, requested: true });
    }
  }

  // Paid / pending: don't delete — mark as cancel requested, host confirms + refunds
  if (rsvp.payment_status === "paid" || rsvp.payment_status === "pending") {
    const { error } = await supabase
      .from("rsvps")
      .update({ payment_status: "cancel_requested" })
      .eq("event_id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, requested: true });
  }

  // Free / unpaid: delete immediately
  const { error } = await supabase.from("rsvps").delete().eq("event_id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    const { promoteNextWaitlisted } = await import("@/lib/waitlist");
    await promoteNextWaitlisted(id);
  } catch (promoteError) {
    console.error("Waitlist promotion failed:", promoteError);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "You must be logged in to cancel an RSVP." }, { status: 401 });

  const { error } = await supabase.from("rsvps").delete().eq("event_id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    const { promoteNextWaitlisted } = await import("@/lib/waitlist");
    await promoteNextWaitlisted(id);
  } catch (promoteError) {
    console.error("Waitlist promotion failed:", promoteError);
  }
  return NextResponse.json({ ok: true });
}
