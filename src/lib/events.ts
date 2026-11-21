import { createClient } from "@/lib/supabase/server";

export type PublicEvent = {
  id: string;
  title: string;
  category: "Workshop" | "Panel" | "Social" | "Study Group";
  description: string;
  included_text: string | null;
  what_to_bring: string | null;
  agenda: string[];
  starts_at: string;
  ends_at: string;
  location: string;
  location_type: "in_person" | "online";
  meeting_url: string | null;
  price_cad: number;
  capacity: number;
  etransfer_email: string | null;
  payment_deadline: string | null;
  image_url: string | null;
  organizer_id: string;
  created_at: string;
  attendee_count: number;
};

export async function getPublishedEvents(): Promise<PublicEvent[]> {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, category, description, included_text, what_to_bring, agenda, starts_at, ends_at, location, location_type, meeting_url, price_cad, capacity, etransfer_email, payment_deadline, image_url, organizer_id, created_at")
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Unable to load events: ${error.message}`);
  if (!events?.length) return [];

  const { data: attendees, error: attendeeError } = await supabase
    .from("public_event_attendees")
    .select("event_id, plus_ones");


  if (attendeeError) throw new Error(`Unable to load attendee counts: ${attendeeError.message}`);

  const counts = new Map<string, number>();
  for (const attendee of attendees ?? []) {
    counts.set(attendee.event_id, (counts.get(attendee.event_id) ?? 0) + 1 + ((attendee as { plus_ones?: number | null }).plus_ones ?? 0));
  }


  return events.map((event) => ({
    ...event,
    attendee_count: counts.get(event.id) ?? 0,
  })) as PublicEvent[];
}

export async function getPublishedEvent(id: string) {
  const events = await getPublishedEvents();
  return events.find((event) => event.id === id) ?? null;
}
