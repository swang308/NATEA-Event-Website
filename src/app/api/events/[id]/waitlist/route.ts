import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to join the waitlist." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { plus_ones?: number; plus_one_name?: string | null };
  const plusOnes = body.plus_ones === 1 ? 1 : 0;
  const plusOneName = typeof body.plus_one_name === "string" ? body.plus_one_name.trim() || null : null;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, capacity, starts_at, status")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (eventError || !event || new Date(event.starts_at) <= new Date()) {
    return NextResponse.json({ error: "This event is not available." }, { status: 400 });
  }

  const { data: existingRsvp } = await supabase
    .from("rsvps")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .neq("payment_status", "refunded")
    .maybeSingle();
  if (existingRsvp) return NextResponse.json({ error: "You already have an RSVP for this event." }, { status: 400 });

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const { data: existingRsvps } = await adminClient
  .from("rsvps")
  .select("plus_ones")
  .eq("event_id", id)
  .neq("payment_status", "refunded");
;
  const currentCount = (existingRsvps ?? []).reduce(
    (sum, row) => sum + 1 + ((row as { plus_ones?: number | null }).plus_ones ?? 0),
    0
  );
  if (currentCount < event.capacity) {
    return NextResponse.json({ error: "This event is not full yet — you can RSVP directly." }, { status: 400 });
  }

  const { error } = await supabase.from("event_waitlist").upsert({
    event_id: id,
    user_id: user.id,
    plus_ones: plusOnes,
    plus_one_name: plusOneName,
  }, { onConflict: "event_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to leave the waitlist." }, { status: 401 });

  const { error } = await supabase.from("event_waitlist").delete().eq("event_id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
