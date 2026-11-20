import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileEmailRecipient, sendBrevoEmail, sendPublishedEventAnnouncement } from "@/lib/brevo";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Only admins can review events." }, { status: 403 });

  const input = await request.json() as { action?: unknown; reason?: unknown };
  const action = input.action === "approve" ? "published" : input.action === "reject" ? "rejected" : null;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!action || (action === "rejected" && !reason)) return NextResponse.json({ error: "Choose approve or provide a rejection reason." }, { status: 400 });

  const { data: event } = await supabase.from("events").select("id, title, organizer_id, status").eq("id", id).eq("status", "pending").single();
  if (!event) return NextResponse.json({ error: "Pending event not found." }, { status: 404 });
  const { data: updated, error } = await supabase.from("events").update({ status: action, rejection_reason: action === "rejected" ? reason : null }).eq("id", id).select("id").single();
  if (error || !updated) return NextResponse.json({ error: error?.message || "Unable to review event." }, { status: 400 });

  if (action === "published") {
    const { data: eventDetails } = await supabase.from("events").select("price_cad, organizer_id, description, location").eq("id", id).single();
    if (eventDetails) await supabase.from("rsvps").upsert({ event_id: id, user_id: eventDetails.organizer_id, payment_status: eventDetails.price_cad === 0 ? "free" : "paid", ...(eventDetails.price_cad > 0 ? { paid_at: new Date().toISOString() } : {}) }, { onConflict: "event_id,user_id" });
    if (eventDetails) {
      try {
        await sendPublishedEventAnnouncement(event.title, eventDetails.description, eventDetails.location);
      } catch (emailError) {
        console.error("Published event announcement failed:", emailError);
      }
    }

  }
  const organizer = await getProfileEmailRecipient(event.organizer_id);
  if (organizer) {
    try {
      await sendBrevoEmail(action === "published" ? "Your NATEA event was approved" : "Your NATEA event needs changes", [organizer], action === "published" ? `<p>Your event <strong>${event.title}</strong> has been approved and is now published.</p>` : `<p>Your event <strong>${event.title}</strong> was rejected.</p><p>Reason: ${reason}</p>`);
    } catch (emailError) {
      console.error("Organizer notification email failed:", emailError);
    }
  }
  return NextResponse.json({ ok: true });
}
