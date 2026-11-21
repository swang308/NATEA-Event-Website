import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  // Load the RSVP for this user + event
  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("payment_status, plus_ones")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rsvp) {
    return NextResponse.json({ error: "No RSVP found." }, { status: 400 });
  }

  if (rsvp.payment_status === "paid") {
    return NextResponse.json({ error: "Already paid." }, { status: 400 });
  }

  // Load the event — price comes from the database, never from the browser
  const { data: event } = await supabase
    .from("events")
    .select("id, title, price_cad")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || !event.price_cad || event.price_cad <= 0) {
    return NextResponse.json(
      { error: "This event does not have a card payment." },
      { status: 400 }
    );
  }

  const plusOnes = rsvp.plus_ones ?? 0;
  const totalCents = Math.round(event.price_cad * 100 * (1 + plusOnes));

  // Locale for the success / cancel URLs, from the page the user came from
  const referer = request.headers.get("referer") || "";
  const locale = referer.includes("/zh-TW") ? "zh-TW" : "en";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: totalCents,
          product_data: { name: event.title },
        },
      },
    ],
    metadata: {
      event_id: eventId,
      rsvp_user_id: user.id,
      plus_ones: String(plusOnes),
    },
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${siteUrl}/${locale}/my-events?checkout=success`,
    cancel_url: `${siteUrl}/${locale}/events/${eventId}`,
  });

  // Do NOT change payment_status here.
  // It stays "unpaid" until the webhook confirms the payment.
  return NextResponse.json({ url: session.url });
}
