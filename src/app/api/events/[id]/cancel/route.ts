import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const { data, error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id).eq("organizer_id", user.id).eq("status", "published").select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Published event not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
