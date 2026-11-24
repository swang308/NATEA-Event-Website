import type { SupabaseClient } from "@supabase/supabase-js";

export type EventHost = {
  id: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: "creator" | "cohost";
  status: "accepted" | "pending";
};

// Is this user the creator, or an accepted co-host? (can edit)
export async function canEditEvent(
  admin: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data: event } = await admin.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
  if (event?.organizer_id === userId) return true;
  const { data: cohost } = await admin.from("event_cohosts").select("id").eq("event_id", eventId).eq("user_id", userId).eq("status", "accepted").maybeSingle();
  return Boolean(cohost);
}

// Only the creator can confirm payments / handle refunds
export async function isEventCreator(
  admin: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data: event } = await admin.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
  return event?.organizer_id === userId;
}

// Creator + accepted co-hosts, for the event detail page
export async function getEventHosts(
  admin: SupabaseClient,
  eventId: string
): Promise<EventHost[]> {
  const { data: event } = await admin.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
  if (!event) return [];
  const { data: creator } = await admin.from("profiles").select("id, email, display_name").eq("id", event.organizer_id).maybeSingle();
  const hosts: EventHost[] = creator ? [{
    id: `creator-${creator.id}`,
    userId: creator.id,
    email: creator.email,
    displayName: creator.display_name,
    role: "creator",
    status: "accepted",
  }] : [];
  const { data: cohosts } = await admin.from("event_cohosts").select("id, user_id, invited_email, status").eq("event_id", eventId).eq("status", "accepted").order("created_at", { ascending: true });
  if (cohosts?.length) {
    const ids = cohosts.map((c) => c.user_id).filter(Boolean) as string[];
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, email, display_name").in("id", ids)
      : { data: [] as { id: string; email: string; display_name: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    for (const c of cohosts) {
      const p = c.user_id ? byId.get(c.user_id) : undefined;
      hosts.push({
        id: c.id,
        userId: c.user_id,
        email: p?.email ?? c.invited_email,
        displayName: p?.display_name ?? null,
        role: "cohost",
        status: "accepted",
      });
    }
  }
  return hosts;
}