import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { token } = await request.json() as { token?: string };
  if (!token) return NextResponse.json({ error: "Invite token is required" }, { status: 400 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite } = await admin.from("event_cohosts").select("id, event_id, invited_email, user_id, status").eq("event_id", eventId).eq("invite_token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status === "accepted") return NextResponse.json({ ok: true, alreadyAccepted: true });

  // Only the invited person can accept (by email or by linked user id)
  const isInvited = invite.user_id === user.id || invite.invited_email.toLowerCase() === user.email?.toLowerCase();
  if (!isInvited) {
    return NextResponse.json({ error: "This invite was sent to a different email" }, { status: 403 });
  }

  const { error } = await admin.from("event_cohosts").update({ status: "accepted", user_id: user.id }).eq("id", invite.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}