import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublishedEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { RsvpButton } from "@/components/RsvpButton";
import { PaymentButton } from "@/components/PaymentButton";
import { CopyButton } from "@/components/CopyButton";
import { connection } from "next/server";
import { CohostManager } from "@/components/CohostManager";
import { getEventHosts } from "@/lib/cohosts";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const instant = false;

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { locale, id } = await params;
  await connection();

  setRequestLocale(locale);
  const t = await getTranslations("EventDetail");
  const event = await getPublishedEvent(id);
  if (!event) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentRsvp } = user
    ? await supabase.from("rsvps").select("id, payment_status, plus_ones, plus_one_name").eq("event_id", id).eq("user_id", user.id).neq("payment_status", "refunded").maybeSingle()
    : { data: null };
  const { data: myProfile } = user ? await supabase.from("profiles").select("etransfer_email").eq("id", user.id).maybeSingle() : { data: null };
  const { data: waitlistEntry } = user
    ? await supabase.from("event_waitlist").select("id").eq("event_id", id).eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isFull = event.attendee_count >= event.capacity;
  const isWaitlisted = Boolean(waitlistEntry);
  const { data: attendees } = await supabase.from("public_event_attendees").select("display_name, avatar_url, avatar_emoji, payment_status, plus_ones, plus_one_name").eq("event_id", id).order("display_name");
  const { data: organizer } = await supabase.from("public_event_organizers").select("display_name, avatar_url").eq("event_id", id).maybeSingle();
  const isOrganizer = Boolean(user && event.organizer_id === user.id);
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const hosts = await getEventHosts(admin, id);
  const isCohost = Boolean(user && hosts.some((h) => h.role === "cohost" && h.userId === user.id));
  const canEdit = isOrganizer || isCohost;

  const date = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(event.starts_at));
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
  const eventStart = new Date(event.starts_at);
  const paymentDeadline = event.payment_deadline ? new Date(event.payment_deadline) : null;
  const eventEnd = event.ends_at ? new Date(event.ends_at) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
  const calendarStart = eventStart.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const calendarEnd = eventEnd.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const endTime = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", {
    timeZone: "America/Toronto",
    timeStyle: "short",
  }).format(eventEnd);
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calendarStart}/${calendarEnd}&location=${encodeURIComponent(event.location_type === "online" ? (event.meeting_url || "Online") : event.location)}&details=${encodeURIComponent(event.description)}`;
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NATEA//EN",
    "BEGIN:VEVENT",
    `UID:${id}@natea-event-website.vercel.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART:${calendarStart}`,
    `DTEND:${calendarEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\r?\n/g, "\\n")}`,
    `LOCATION:${event.location_type === "online" ? (event.meeting_url || "Online") : event.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const icsUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;

  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${locale}/events/${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(eventUrl)}`;

  return (
    <main className="min-h-screen bg-bg2 py-10">
      <div className="container">
        <article className="mt-8 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="gradient-mix p-8 text-white md:p-12">
            <p className="text-sm font-bold uppercase tracking-[.18em]">{event.category}</p>
            <h1 className="display mt-4 text-4xl font-extrabold md:text-6xl">{event.title}</h1>
          </div>
          <div className="grid gap-10 p-8 md:grid-cols-[1fr_320px] md:p-12">
            <div>
              <h2 className="display text-2xl font-extrabold">{t("about")}</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-muted">{event.description || t("noDescription")}</p>
              <h2 className="display mt-10 text-2xl font-extrabold">{t("agenda")}</h2>
              {event.agenda.length > 0 && <ul className="mt-4 space-y-3 text-muted">{event.agenda.map((item) => { const [time, ...titleParts] = item.split(" — "); const title = titleParts.join(" — "); return <li key={item} className="flex gap-4 border-b border-line pb-3 last:border-0"><span className="w-20 shrink-0 font-bold text-teal-d">{titleParts.length > 0 ? time : ""}</span><span>{titleParts.length > 0 ? title : item}</span></li>; })}</ul>}
              {event.image_url && (
                <div className="mt-6 border-t border-line pt-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.image_url} alt={`${event.title} flyer`} className="w-full rounded-xl" />
                </div>
              )}
            </div>
            <aside className="rounded-2xl border border-line bg-bg2 p-6">
              <p className="text-sm text-muted">{t("price")}</p>
              <p className="display mt-1 text-3xl font-extrabold">{event.price_cad === 0 ? t("free") : `$${event.price_cad} CAD`}</p>
              {event.price_cad > 0 && <p className="mt-1 text-sm text-muted">{t("perPerson")}</p>}
              {currentRsvp && event.price_cad > 0 && (
                <p className="mt-3 text-sm font-bold text-ink">
                  {(currentRsvp?.plus_ones ?? 0) > 0
                    ? currentRsvp.payment_status === "paid"
                      ? t("paidTotal", { amount: `$${event.price_cad * (1 + (currentRsvp?.plus_ones ?? 0))} CAD` })
                      : t("rsvpTotal", { amount: `$${event.price_cad * (1 + (currentRsvp?.plus_ones ?? 0))} CAD` })
                    : currentRsvp.payment_status === "paid"
                      ? t("paidTotal", { amount: `$${event.price_cad} CAD` })
                      : t("total", { amount: `$${event.price_cad} CAD` })}
                </p>
              )}

              <p className="mt-5 text-sm font-bold text-ink">{t("spots", { count: event.attendee_count, capacity: event.capacity })}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal" style={{ width: `${Math.min((event.attendee_count / event.capacity) * 100, 100)}%` }} /></div>
              {isOrganizer ? <p className="mt-6 rounded-full bg-chip px-5 py-3.5 text-center font-bold text-muted">{t("youAreOrganizer")}</p> : user ? <RsvpButton eventId={id} isRsvped={Boolean(currentRsvp)} paymentStatus={currentRsvp?.payment_status ?? null} priceCents={event.price_cad * 100} initialPlusOnes={currentRsvp?.plus_ones ?? 0} initialPlusOneName={currentRsvp?.plus_one_name ?? null} isFull={isFull} isWaitlisted={isWaitlisted} initialEtransferEmail={myProfile?.etransfer_email ?? null} labels={t.raw("rsvp") as never} />
                : <Link href={`/login?redirect=/events/${id}`} className="mt-6 inline-flex w-full justify-center rounded-full bg-teal px-5 py-3.5 font-bold text-white">{t("loginToRsvp")}</Link>}
              {canEdit && (
                <Link href={`/${locale}/events/${id}/edit`} className="mt-4 inline-flex w-full justify-center rounded-full border border-teal bg-white px-5 py-3 font-bold text-teal-d">
                  Edit event
                </Link>
              )}
              {!isOrganizer && currentRsvp && event.price_cad > 0 && currentRsvp.payment_status === "unpaid" && <div className="mt-6 space-y-4 border-t border-line pt-5">
                <div className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-sm font-bold text-ink">{t("payByEtransferTitle")}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("payment.instructions", { amount: `$${event.price_cad * (1 + (currentRsvp?.plus_ones ?? 0))} CAD`, email: event.etransfer_email || t("payment.emailMissing") })}</p>
                  {paymentDeadline && <p className="mt-2 text-xs font-bold text-muted">{t("payment.deadline", { date: new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(paymentDeadline) })}</p>}{paymentDeadline && paymentDeadline <= new Date() && <p className="mt-2 text-sm font-bold text-red-700">{t("payment.overdue")}</p>}
                  <div className="mt-4"><PaymentButton eventId={id} rsvpId={currentRsvp.id} action="mark-sent" label={t("payment.markSent")} working={t("payment.working")} error={t("payment.error")} success={t("payment.sentConfirmation")} confirmation={t("payment.confirmation")} /></div>
                </div>
              </div>}

              {!isOrganizer && currentRsvp && event.price_cad > 0 && currentRsvp.payment_status === "pending" && <p role="status" className="mt-6 border-t border-line pt-5 text-sm font-bold text-green-800">{t("payment.sentConfirmation")}</p>}
              <div className="mt-6 rounded-2xl border border-line bg-bg2 p-5">
                <h3 className="display text-lg font-extrabold">{t("date")}</h3>
                <p className="mt-1 text-muted">{date} – {endTime}</p>


                <h3 className="display mt-4 text-lg font-extrabold">{t("location")}</h3>
                {event.location_type === "online" ? (
                  <>
                    <p className="mt-1 text-muted">{t("online")}</p>
                    {event.meeting_url && (isOrganizer || currentRsvp) ? (
                      <a href={event.meeting_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-teal px-4 py-2 text-sm font-bold text-white">{t("joinMeeting")} ↗</a>
                    ) : (
                      <p className="mt-3 text-sm text-muted">{t("meetingAfterRsvp")}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-muted">{event.location}</p>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                      className="mt-3 h-64 w-full rounded-xl border border-line"
                      loading="lazy"
                    />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-bold text-purple underline-offset-4 hover:underline"
                    >
                      {t("openInMaps")}
                    </a>
                  </>
                )}
              </div>

              {(event.included_text || event.what_to_bring) && (
                <div className="mt-8 grid gap-4 rounded-2xl bg-bg2 p-5 text-sm text-muted">
                  {event.included_text && (
                    <div><p className="font-bold text-ink">{t("includedTitle")}</p><p className="mt-1 whitespace-pre-wrap">{event.included_text}</p></div>
                  )}
                  {event.what_to_bring && (
                    <div><p className="font-bold text-ink">{t("bringTitle")}</p><p className="mt-1 whitespace-pre-wrap">{event.what_to_bring}</p></div>
                  )}
                </div>
              )}
              <section className="mt-12">
                <h2 className="display text-2xl font-extrabold">{t("whoIsComing")}</h2>
                <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-line rounded-2xl border border-line bg-card">
                  {(attendees ?? []).map((attendee) => <div key={attendee.display_name} className="flex items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3">{attendee.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={attendee.avatar_url} alt={attendee.display_name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (attendee as { avatar_emoji?: string | null }).avatar_emoji ? (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-lg">{(attendee as { avatar_emoji?: string | null }).avatar_emoji}</span>
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-sm font-bold text-teal-d">{attendee.display_name.slice(0, 1).toUpperCase()}</span>
                  )}<span className="font-medium">{attendee.display_name}
                      {((attendee as { plus_ones?: number | null }).plus_ones ?? 0) > 0 && (
                        <span className="block text-xs font-normal text-muted">+ {(attendee as { plus_one_name?: string | null }).plus_one_name || t("guest")}</span>
                      )}
                    </span>
                  </div><span className="rounded-full bg-bg2 px-3 py-1 text-xs font-bold text-muted">{event.price_cad === 0 ? t("statuses.free") : t(`statuses.${attendee.payment_status}` as "statuses.paid")}</span></div>)}
                  {(!attendees || attendees.length === 0) && <p className="px-4 py-5 text-sm text-muted">{t("noAttendees")}</p>}
                </div>
              </section>
            </aside>

          </div>
          <div className="grid gap-6 border-t border-line p-8 md:grid-cols-2 lg:grid-cols-4 md:p-12">
            <section className="rounded-2xl border border-line bg-bg2 p-6"><h2 className="display text-xl font-extrabold">{t("organizer")}</h2><p className="mt-3 font-bold">{organizer?.display_name || t("organizerFallback")}</p>{event.price_cad > 0 && event.etransfer_email && <div className="mt-3 flex items-start gap-2 text-sm"><span className="min-w-0 break-all leading-5 text-muted">{event.etransfer_email}</span><CopyButton value={event.etransfer_email} label={t("copy")} copiedLabel={t("copied")} /></div>}<p className="mt-3 text-xs leading-5 text-muted">{event.price_cad === 0 ? t("freeOrganizerNote") : t("organizerNote")}</p></section>
            <CohostManager eventId={id} isCreator={isOrganizer} initialHosts={hosts} />
            <section className="rounded-2xl border border-line bg-bg2 p-6"><h2 className="display text-xl font-extrabold">{t("discuss")}</h2><p className="mt-3 text-sm leading-6 text-muted">{t("lineButton") === "Open Line" ? "Chat with other attendees in the NATEA Line group." : "在 NATEA Line 群組和其他參加者聊天。"}</p><a href="https://line.me/ti/g/M8agqVHJnT" target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full justify-center whitespace-nowrap rounded-full border border-teal bg-white px-5 py-3 text-sm font-bold text-teal-d">{t("lineButton")}</a>
            </section>
            <section className="rounded-2xl border border-line bg-bg2 p-6"><h2 className="display text-xl font-extrabold">{t("calendar")}</h2><p className="mt-3 text-sm leading-6 text-muted">{t("addToCalendar") === "Add to Google Calendar" ? "Save the date so you don't miss it." : "把活動加入行事曆，不要錯過。"}</p>
              <a href={calendarUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full justify-center whitespace-nowrap rounded-full bg-purple px-5 py-3 text-sm font-bold text-white" style={{ color: "#fff" }}>{t("addToCalendar")}</a>
              <a href={icsUrl} download={`${event.title}.ics`} className="mt-3 inline-flex w-full justify-center whitespace-nowrap rounded-full border border-purple bg-white px-5 py-3 text-sm font-bold text-purple">{t("downloadIcs")}</a>
            </section>
            <section className="rounded-2xl border border-line bg-bg2 p-6 text-center"><h2 className="display text-xl font-extrabold">{t("share")}</h2><p className="mt-3 text-sm text-muted">{t("shareScan")}</p>
              <div className="mx-auto mt-4 inline-block rounded-xl bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt={t("share")} className="h-28 w-28 rounded-lg" />
              </div>
              <div className="mt-4 flex justify-center">
                <CopyButton value={eventUrl} label={t("copyLink")} copiedLabel={t("copied")} />
              </div>
            </section>
          </div>

        </article>
      </div>
    </main>
  );
}