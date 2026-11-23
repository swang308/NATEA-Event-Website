import { createClient } from "@supabase/supabase-js";
import { sendWaitlistPromotedEmail } from "@/lib/brevo";

export async function promoteNextWaitlisted(eventId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || !serviceKey) return null;
  const admin = createClient(url, serviceKey);

  const { data: event } = await admin
    .from("events")
    .select("id, title, location, location_type, price_cad, capacity, starts_at")
    .eq("id", eventId)
    .single();
  if (!event) return null;

  const { data: rsvps } = await admin
    .from("rsvps")
    .select("plus_ones")
    .eq("event_id", eventId)
    .neq("payment_status", "refunded");
  const currentCount = (rsvps ?? []).reduce((sum, row) => sum + 1 + ((row as { plus_ones?: number | null }).plus_ones ?? 0), 0);

  const { data: entry } = await admin
    .from("event_waitlist")
    .select("id, user_id, plus_ones, plus_one_name")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!entry) return null;
  if (currentCount + 1 + (entry.plus_ones ?? 0) > event.capacity) return null;

  await admin.from("event_waitlist").delete().eq("id", entry.id);
  await admin.from("rsvps").upsert({
    event_id: eventId,
    user_id: entry.user_id,
    payment_status: event.price_cad === 0 ? "free" : "unpaid",
    plus_ones: entry.plus_ones ?? 0,
    plus_one_name: entry.plus_one_name ?? null,
    paid_at: null,
  }, { onConflict: "event_id,user_id" });

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", entry.user_id)
      .maybeSingle();
    if (profile) {
      await sendWaitlistPromotedEmail({
        toEmail: profile.email,
        toName: profile.display_name,
        eventTitle: event.title,
        eventDate: new Date(event.starts_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short" }),
        eventLocation: event.location_type === "online" ? "Online" : event.location,
        eventUrl: `${siteUrl}/events/${event.id}`,
        amount: `$${event.price_cad * (1 + (entry.plus_ones ?? 0))} CAD`,
      });
    }
  } catch (emailError) {
    console.error("Waitlist promotion email failed:", emailError);
  }
  return entry.user_id;
}
