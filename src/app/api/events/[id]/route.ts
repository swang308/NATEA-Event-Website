import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const { data, error } = await supabase.from("events").delete().eq("id", id).eq("organizer_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";

  const input = await request.json() as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const locationType = input.locationType === "online" ? "online" : "in_person";
  const meetingUrl = typeof input.meetingUrl === "string" ? input.meetingUrl.trim() : "";
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : null;
  const priceCad = Number(input.priceCad);
  const capacity = Number(input.capacity);
  const agenda = Array.isArray(input.agenda) ? input.agenda.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
  const imageUrl = typeof input.imageUrl === "string" && input.imageUrl.trim() ? input.imageUrl.trim() : null;
  const includedText = typeof input.includedText === "string" ? input.includedText.trim() : "";
  const whatToBring = typeof input.whatToBring === "string" ? input.whatToBring.trim() : "";
  const paymentDeadlineInput = typeof input.paymentDeadline === "string" && input.paymentDeadline ? new Date(input.paymentDeadline) : null;
  const status = ["draft", "pending", "published", "rejected", "cancelled"].includes(String(input.status)) ? String(input.status) : null;

  if (!title || title.length > 200 || !location || !startsAt || Number.isNaN(startsAt.getTime()) || startsAt <= new Date() || !Number.isInteger(priceCad) || priceCad < 0 || !Number.isInteger(capacity) || capacity < 2 || !status) {
    return NextResponse.json({ error: "Please complete all event fields with valid values." }, { status: 400 });
  }

  const { data: currentEvent } = await supabase.from("events").select("status, organizer_id, title").eq("id", id).maybeSingle();
  const { data: cohost } = await supabase
    .from("event_cohosts")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!currentEvent || (currentEvent.organizer_id !== user.id && !isAdmin && !cohost)) return NextResponse.json({ error: "You are not the organizer of this event." }, { status: 403 }); if (status === "published" && currentEvent.status !== "published" && !isAdmin) return NextResponse.json({ error: "Only an admin can publish an event." }, { status: 403 });
  if (status === "cancelled" && currentEvent.status !== "published") return NextResponse.json({ error: "Only published events can be cancelled." }, { status: 400 });
  if (status === "rejected") return NextResponse.json({ error: "Use the admin review endpoint for this action." }, { status: 403 });
  const paymentDeadline = priceCad > 0 ? paymentDeadlineInput ?? new Date(startsAt.getTime() - 24 * 60 * 60 * 1000) : null;
  if (paymentDeadline && (Number.isNaN(paymentDeadline.getTime()) || paymentDeadline > startsAt)) return NextResponse.json({ error: "The payment deadline must be before the event starts." }, { status: 400 });
  const endsAtInput = typeof input.endsAt === "string" && input.endsAt ? new Date(input.endsAt) : null;
  const endDate = endsAtInput && !Number.isNaN(endsAtInput.getTime())
    ? endsAtInput
    : new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  if (endDate <= startsAt) return NextResponse.json({ error: "The end time must be after the start time." }, { status: 400 });

  const { data, error } = await supabase.from("events").update({
    title,
    category: input.category,
    starts_at: startsAt.toISOString(),
    ends_at: endDate.toISOString(),
    location,
    location_type: locationType,
    meeting_url: meetingUrl || null,
    price_cad: priceCad,
    capacity,
    etransfer_email: typeof input.etransferEmail === "string" ? input.etransferEmail.trim() || null : null,
    description: typeof input.description === "string" ? input.description.trim() : "",
    included_text: includedText || null,
    what_to_bring: whatToBring || null,
    agenda,
    image_url: imageUrl,
    payment_deadline: paymentDeadline?.toISOString() ?? null,
    status,
  }).eq("id", id).select("id").single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Event not found." }, { status: 400 });
  if (status === "published" && currentEvent.status !== "published") {
    await supabase.from("rsvps").upsert({
      event_id: id,
      user_id: currentEvent.organizer_id,
      payment_status: priceCad === 0 ? "free" : "paid",
      ...(priceCad > 0 ? { paid_at: new Date().toISOString() } : {}),
    }, { onConflict: "event_id,user_id" });
  }
  return NextResponse.json({ id: data.id });
}
