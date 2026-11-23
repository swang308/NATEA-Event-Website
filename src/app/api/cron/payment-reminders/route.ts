import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPaymentReminderEmail } from "@/lib/brevo";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server email configuration is incomplete." }, { status: 500 });
  const supabase = createClient(url, serviceKey);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: events, error: eventError } = await supabase.from("events").select("id, title, price_cad, etransfer_email, payment_deadline").eq("status", "published").gt("payment_deadline", now.toISOString()).lte("payment_deadline", windowEnd.toISOString());
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  let sent = 0;
  for (const event of events ?? []) {
    const { data: rsvps, error: rsvpError } = await supabase.from("rsvps").select("id, user_id, payment_reminder_sent_at").eq("event_id", event.id).eq("payment_status", "unpaid").is("payment_reminder_sent_at", null);
    if (rsvpError) return NextResponse.json({ error: rsvpError.message }, { status: 500 });
    for (const rsvp of rsvps ?? []) {
      const { data: profile } = await supabase.from("profiles").select("email, display_name").eq("id", rsvp.user_id).maybeSingle();
      if (!profile || !event.payment_deadline) continue;
      await sendPaymentReminderEmail({
        toEmail: profile.email,
        toName: profile.display_name,
        eventTitle: event.title,
        amount: `$${event.price_cad} CAD`,
        deadline: new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(event.payment_deadline)),
        eventUrl: `${siteUrl}/events/${event.id}`,
      });
      await supabase.from("rsvps").update({ payment_reminder_sent_at: now.toISOString() }).eq("id", rsvp.id);
      sent += 1;
    }
  }
  return NextResponse.json({ sent });
}
