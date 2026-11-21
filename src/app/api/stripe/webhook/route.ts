import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import {
  getProfileEmailRecipient,
  sendPaymentConfirmedEmail,
} from "@/lib/brevo";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret." },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as any;

  // Only process paid sessions
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const eventId = session.metadata?.event_id as string | undefined;
  const rsvpUserId = session.metadata?.rsvp_user_id as string | undefined;

  if (!eventId || !rsvpUserId) {
    console.error("Webhook missing metadata:", session.id);
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Idempotency: if already paid, do nothing
  const { data: rsvp } = await admin
    .from("rsvps")
    .select("payment_status, plus_ones, plus_one_name")
    .eq("event_id", eventId)
    .eq("user_id", rsvpUserId)
    .maybeSingle();

  if (!rsvp) {
    console.error("Webhook: RSVP not found", eventId, rsvpUserId);
    return NextResponse.json({ received: true });
  }

  if (rsvp.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  const { error: updateError } = await admin
    .from("rsvps")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("event_id", eventId)
    .eq("user_id", rsvpUserId);

  if (updateError) {
    console.error("Webhook: RSVP update failed:", updateError);
    return NextResponse.json({ received: true });
  }

  // Payment-confirmed email — must never fail the webhook
  try {
    const { data: eventRow } = await admin
      .from("events")
      .select("title, price_cad, starts_at, location, location_type")
      .eq("id", eventId)
      .maybeSingle();

    const recipient = await getProfileEmailRecipient(rsvpUserId);
    if (recipient && eventRow) {
      await sendPaymentConfirmedEmail({
        toEmail: recipient.email,
        toName: recipient.name ?? "there",
        eventTitle: eventRow.title,
        eventDate: eventRow.starts_at
          ? new Date(eventRow.starts_at).toLocaleString("en-CA", {
              timeZone: "America/Toronto",
              dateStyle: "full",
              timeStyle: "short",
            })
          : "",
        eventLocation:
          eventRow.location_type === "online"
            ? "Online"
            : eventRow.location ?? "",
        eventUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/en/events/${eventId}`,
        totalCents:
          (eventRow.price_cad ?? 0) * 100 * (1 + (rsvp.plus_ones ?? 0)),
        guestName:
          rsvp.plus_ones > 0 ? rsvp.plus_one_name : null,
      });
    }
  } catch (emailError) {
    console.error("Payment confirmation email failed:", emailError);
  }

  return NextResponse.json({ received: true });
}
