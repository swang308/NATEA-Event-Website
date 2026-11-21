import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmailRecipients, sendBrevoEmail, sendPublishedEventAnnouncement } from "@/lib/brevo";

const categories = new Set(["Workshop", "Panel", "Social", "Study Group"]);
const statuses = new Set(["draft", "pending", "published"]);

type EventInput = {
  title?: unknown;
  category?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  location?: unknown;
  locationType?: unknown;
  meetingUrl?: unknown;
  priceCad?: unknown;
  capacity?: unknown;
  etransferEmail?: unknown;
  paymentDeadline?: unknown;
  description?: unknown;
  includedText?: unknown;
  whatToBring?: unknown;
  agenda?: unknown;
  imageUrl?: unknown;
  status?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to create an event." }, { status: 401 });
  }

  const input = await request.json() as EventInput;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = input.category;
  const startsAt = input.startsAt;
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const locationType = input.locationType === "online" ? "online" : "in_person";
  const meetingUrl = typeof input.meetingUrl === "string" ? input.meetingUrl.trim() : "";
  const priceCad = Number(input.priceCad);
  const capacity = Number(input.capacity);
  const etransferEmail = typeof input.etransferEmail === "string" ? input.etransferEmail.trim() : null;
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const includedText = typeof input.includedText === "string" ? input.includedText.trim() : "";
  const whatToBring = typeof input.whatToBring === "string" ? input.whatToBring.trim() : "";
  const agenda = Array.isArray(input.agenda) ? input.agenda.filter(isNonEmptyString).map((item) => item.trim()) : [];
  const imageUrl = typeof input.imageUrl === "string" && input.imageUrl.trim() ? input.imageUrl.trim() : null;
  const status = input.status;
  const paymentDeadlineInput = typeof input.paymentDeadline === "string" && input.paymentDeadline ? new Date(input.paymentDeadline) : null;

  if (title.length < 1 || title.length > 200 || !categories.has(String(category)) || !isNonEmptyString(startsAt) || !isNonEmptyString(location) || !Number.isInteger(priceCad) || priceCad < 0 || !Number.isInteger(capacity) || capacity < 2 || !statuses.has(String(status))) {
    return NextResponse.json({ error: "Please complete all event fields with valid values." }, { status: 400 });
  }

  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime()) || startDate <= new Date()) {
    return NextResponse.json({ error: "The event date must be in the future." }, { status: 400 });
  }
  const endsAtInput = typeof input.endsAt === "string" && input.endsAt ? new Date(input.endsAt) : null;
  const endDate = endsAtInput && !Number.isNaN(endsAtInput.getTime())
    ? endsAtInput
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  if (endDate <= startDate) {
    return NextResponse.json({ error: "The end time must be after the start time." }, { status: 400 });
  }

  const paymentDeadline = priceCad > 0 ? paymentDeadlineInput ?? new Date(startDate.getTime() - 24 * 60 * 60 * 1000) : null;
  if (paymentDeadline && (Number.isNaN(paymentDeadline.getTime()) || paymentDeadline > startDate)) {
    return NextResponse.json({ error: "The payment deadline must be before the event starts." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      organizer_id: user.id,
      title,
      category,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      location,

      location_type: locationType,
      meeting_url: meetingUrl || null,
      price_cad: priceCad,
      capacity,
      etransfer_email: etransferEmail || null,
      payment_deadline: paymentDeadline?.toISOString() ?? null,
      description,
      included_text: includedText || null,
      what_to_bring: whatToBring || null,
      agenda,
      image_url: imageUrl,
      status,
    })
    .select("id")
    .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  if (status === "published") {
    const { error: rsvpError } = await supabase.from("rsvps").insert({
      event_id: event.id,
      user_id: user.id,
      payment_status: priceCad === 0 ? "free" : "paid",
      ...(priceCad > 0 ? { paid_at: new Date().toISOString() } : {}),
    });

    if (rsvpError) {
      await supabase.from("events").delete().eq("id", event.id);
      return NextResponse.json({ error: rsvpError.message }, { status: 400 });
    }
    try {
      await sendPublishedEventAnnouncement(title, description, location);
    } catch (emailError) {
      console.error("Published event announcement failed:", emailError);
    }

  }

  if (status === "pending") {
    try {
      await notifyAdminsOfSubmission(event.id, title);
    } catch (emailError) {
      console.error("Admin notification email failed:", emailError);
    }
  }
  return NextResponse.json({ id: event.id }, { status: 201 });

}

async function notifyAdminsOfSubmission(eventId: string, title: string) {
  await sendBrevoEmail("New NATEA event awaiting approval", await getAdminEmailRecipients(), `<p>A new NATEA event is awaiting approval: <strong>${title}</strong> (${eventId}).</p>`);
}
