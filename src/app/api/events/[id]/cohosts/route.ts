import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendCohostInviteEmail } from "@/lib/brevo";

type Props = { params: Promise<{ id: string }> };

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, serviceKey);
}

// POST — creator invites a co-host by email
export async function POST(request: Request, { params }: Props) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { email } = await request.json() as { email?: string };
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const invitedEmail = email.trim().toLowerCase();

  const admin = getAdminClient();
  const { data: event } = await admin.from("events").select("id, title, starts_at, organizer_id").eq("id", eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Only the creator can invite co-hosts" }, { status: 403 });
  }
  if (invitedEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You are already the creator" }, { status: 400 });
  }

  const { data: profile } = await admin.from("profiles").select("id, email, display_name").eq("email", invitedEmail).maybeSingle();

  const { data: cohost, error } = await admin.from("event_cohosts").insert({
    event_id: eventId,
    user_id: profile?.id ?? null,
    invited_email: invitedEmail,
    invited_by: user.id,
    status: "pending",
  }).select("id, invite_token").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: organizerProfile } = await admin.from("profiles").select("display_name, email").eq("id", user.id).maybeSingle();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const eventDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at));
  const acceptUrl = `${siteUrl}/en/events/${eventId}/cohosts/accept?token=${cohost.invite_token}`;

  try {
    await sendCohostInviteEmail({
      to: invitedEmail,
      eventTitle: event.title,
      eventDate,
      organizerName: organizerProfile?.display_name || organizerProfile?.email || "The organizer",
      acceptUrl,
    });
  } catch (caughtError) {
    console.error("Cohost invite email failed", caughtError);
  }

  return NextResponse.json({ ok: true, cohostId: cohost.id });
}

// DELETE — creator removes a co-host
export async function DELETE(request: Request, { params }: Props) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { cohostId } = await request.json() as { cohostId?: string };
  if (!cohostId) return NextResponse.json({ error: "cohostId is required" }, { status: 400 });

  const admin = getAdminClient();
  const { data: event } = await admin.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Only the creator can remove co-hosts" }, { status: 403 });
  }

  const { error } = await admin.from("event_cohosts").delete().eq("id", cohostId).eq("event_id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}