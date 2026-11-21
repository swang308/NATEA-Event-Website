import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendRsvpConfirmationEmail } from "@/lib/brevo";

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
    const { data: organizerProfile } = await supabase
      .from("profiles")
      .select("etransfer_email")
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
        etransferEmail: organizerProfile?.etransfer_email ?? null,
      });
    }
  } catch (emailError) {
    console.error("RSVP confirmation email failed:", emailError);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
