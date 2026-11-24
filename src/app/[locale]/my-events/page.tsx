import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { PaymentButton } from "@/components/PaymentButton";
import { PaymentConfirmationList } from "@/components/PaymentConfirmationList";
import { CopyButton } from "@/components/CopyButton";
import { GuestNameEditor } from "@/components/GuestNameEditor";
import { RsvpButton } from "@/components/RsvpButton";

type Props = { params: Promise<{ locale: string }> };

export const instant = false;

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export default async function MyEventsPage({ params }: Props) {
  const { locale } = await params;
  await connection();
  const now = new Date();
  setRequestLocale(locale);
  const t = await getTranslations("Routes.myEvents");
  const tEventDetail = await getTranslations("EventDetail");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <main className="grid min-h-screen place-items-center bg-bg2 px-5"><section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-sm"><h1 className="display text-4xl font-extrabold">{t("title")}</h1><p className="mt-4 text-muted">{t("loginRequired")}</p><Link href="/login" className="mt-8 inline-flex rounded-full bg-teal px-6 py-3.5 font-bold text-white">{t("login")}</Link></section></main>;

  const [profileResult, hostedEventsResult, rsvpsResult] = await Promise.all([
    supabase.from("profiles").select("display_name, email, role, etransfer_email").eq("id", user.id).single(),
    supabase.from("events").select("id, title, starts_at, location, status, price_cad").eq("organizer_id", user.id).order("starts_at", { ascending: true }),
    supabase.from("rsvps").select("id, event_id, payment_status, plus_ones, plus_one_name, events(title, starts_at, location, price_cad, etransfer_email, payment_deadline)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const profile = profileResult.data;
  const isAdmin = profile?.role === "admin";
  const hostedEvents = hostedEventsResult.data;

  const rsvps = rsvpsResult.data;
  const hostedEventIds = (hostedEvents ?? []).map((event) => event.id);

  let hostedRsvpsResult;
  if (hostedEventIds.length) {
    const [pendingResult, paidResult] = await Promise.all([
      supabase
        .from("rsvps")
        .select("id, event_id, user_id, payment_status, created_at, plus_ones, profiles(display_name, email, avatar_url), events(title, price_cad)")
        .in("event_id", hostedEventIds)
        .in("payment_status", ["pending", "cancel_requested"])
        .order("created_at", { ascending: true }),
      supabase
        .from("rsvps")
        .select("id, event_id, user_id, payment_status, paid_at, plus_ones, profiles(display_name, email, avatar_url), events(title, price_cad)")
        .in("event_id", hostedEventIds)
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false }),
    ]);

    if (paidResult.error?.message.includes("paid_at")) {
      const paidWithoutDate = await supabase
        .from("rsvps")
        .select("id, event_id, user_id, payment_status, plus_ones, profiles(display_name, email, avatar_url), events(title, price_cad)")
        .in("event_id", hostedEventIds)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: true });
      hostedRsvpsResult = { data: [...(pendingResult.data ?? []), ...(paidWithoutDate.data ?? []).map((row) => ({ ...row, paid_at: null }))], error: pendingResult.error ?? paidWithoutDate.error };
    } else {
      hostedRsvpsResult = { data: [...(pendingResult.data ?? []), ...(paidResult.data ?? [])], error: pendingResult.error ?? paidResult.error };
    }
  } else {
    hostedRsvpsResult = { data: null, error: null };
  }

  const hostedRsvps = (hostedRsvpsResult.data ?? []).map((rsvp) => {
    const profileInfo = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
    const eventInfo = Array.isArray(rsvp.events) ? rsvp.events[0] : rsvp.events;
    return {
      rsvp_id: rsvp.id,
      event_id: rsvp.event_id,
      user_id: rsvp.user_id,
      payment_status: rsvp.payment_status,
      paid_at: "paid_at" in rsvp && typeof rsvp.paid_at === "string" ? rsvp.paid_at : null,
      created_at: "created_at" in rsvp && typeof rsvp.created_at === "string" ? rsvp.created_at : null,
      event_title: eventInfo?.title ?? "",
      display_name: profileInfo?.display_name ?? "",
      email: profileInfo?.email ?? "",
      price_cad: eventInfo?.price_cad ?? 0,
      plus_ones: (rsvp as { plus_ones?: number | null }).plus_ones ?? 0,
    };
  });

  if (hostedRsvpsResult.error) {
    console.error("[NATEA hosted payment RSVPs query]", { auth_uid: user.id, event_ids: hostedEventIds, error: hostedRsvpsResult.error.message });
  } else {
    console.info("[NATEA hosted payment RSVPs]", {
      auth_uid: user.id,
      event_ids: hostedEventIds,
      pending: hostedRsvps.filter((rsvp) => rsvp.payment_status === "pending" && rsvp.user_id !== user.id),
    });
  }

  if (hostedEventsResult.error) {
    console.error("[NATEA hosted events query]", { auth_uid: user.id, error: hostedEventsResult.error.message });
  } else {
    console.info("[NATEA hosted events]", {
      auth_uid: user.id,
      count: hostedEvents?.length ?? 0,
      events: (hostedEvents ?? []).map((event) => ({ id: event.id, title: event.title, status: event.status })),
    });
  }
  return (
    <main className="min-h-screen bg-bg2 py-10"><div className="container">
      <div className="flex flex-wrap items-end justify-between gap-5"><div>
        <h1 className="display mt-10 text-4xl font-extrabold">{t("title")}</h1><p className="mt-2 text-muted">{profile?.display_name || user.email}</p></div><div className="flex gap-3">{isAdmin && <Link href="/admin/events" className="rounded-full border border-purple px-5 py-3 font-bold text-purple">{locale === "zh-TW" ? "管理" : "Admin"}</Link>}<Link href="/profile" className="rounded-full border border-purple px-5 py-3 font-bold text-purple">{t("profile")}</Link><Link href="/events/new" className="rounded-full bg-purple px-5 py-3 font-bold !text-white">{t("host")}</Link></div>
      </div>
      <section className="mt-12"><h2 className="display text-2xl font-extrabold">{t("going")}</h2><div className="mt-4 grid gap-4">{(rsvps ?? []).filter((rsvp) => rsvp.payment_status !== "refunded").length ? (rsvps ?? []).filter((rsvp) => rsvp.payment_status !== "refunded").map((rsvp) => {
        const eventInfo = Array.isArray(rsvp.events) ? rsvp.events[0] : rsvp.events; const isPaid = eventInfo?.price_cad > 0; const deadline = eventInfo?.payment_deadline ? new Date(eventInfo.payment_deadline) : null; const overdue = Boolean(deadline && deadline <= now && rsvp.payment_status === "unpaid");
        return <article key={rsvp.event_id} className="rounded-2xl border border-line bg-card p-5"><Link href={`/events/${rsvp.event_id}`} className="block"><h3 className="font-bold text-purple underline-offset-4 hover:underline">{eventInfo?.title}</h3><p className="mt-1 text-sm text-muted">{eventInfo?.starts_at ? new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(new Date(eventInfo.starts_at)) : ""}{eventInfo?.location ? ` · ${eventInfo.location}` : ""}</p>{isPaid && <p className="mt-1 text-sm font-bold text-ink">${eventInfo.price_cad * (1 + ((rsvp as { plus_ones?: number | null }).plus_ones ?? 0))} CAD</p>}</Link><p className="mt-1 text-sm text-muted">{overdue ? t("paymentOverdue") : t(rsvp.payment_status)}</p>{((rsvp as { plus_ones?: number | null }).plus_ones ?? 0) > 0 && rsvp.payment_status !== "cancel_requested" && (
          <GuestNameEditor
            eventId={rsvp.event_id}
            initialName={(rsvp as { plus_one_name?: string | null }).plus_one_name ?? null}
            labels={{
              guestName: t("guestName"),
              guestNamePlaceholder: t("guestNamePlaceholder"),
              guest: t("guest"),
              editGuest: t("editGuest"),
              addGuest: t("addGuest"),
              saveGuest: t("saveGuest"),
              cancelEdit: t("cancelEdit"),
              error: t("error"),
            }}
          />
        )}{rsvp.payment_status !== "cancel_requested" && (
          <div className="mt-3">
            <RsvpButton
              eventId={rsvp.event_id}
              isRsvped={true}
              paymentStatus={rsvp.payment_status as "free" | "unpaid" | "pending" | "paid" | "refunded" | "cancel_requested" | null}
              priceCents={(eventInfo?.price_cad ?? 0) * 100}
              initialPlusOnes={(rsvp as { plus_ones?: number | null }).plus_ones ?? 0}
              initialPlusOneName={(rsvp as { plus_one_name?: string | null }).plus_one_name ?? null}
              initialEtransferEmail={(profile as { etransfer_email?: string | null })?.etransfer_email ?? null}
              showStatus={false}
              labels={tEventDetail.raw("rsvp") as never}
            />
          </div>
        )}{isPaid && rsvp.payment_status === "unpaid" && <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-sm font-bold text-ink">{t("payByEtransferTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{t("paymentInstructions", { amount: `$${eventInfo.price_cad * (1 + ((rsvp as { plus_ones?: number | null }).plus_ones ?? 0))} CAD`, email: eventInfo.etransfer_email || t("paymentEmailMissing") })}</p>
          {deadline && <p className="mt-2 text-xs font-bold text-muted">{t("paymentDeadline", { date: new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(deadline) })}</p>}
          {overdue && <p className="mt-2 text-sm font-bold text-red-700">{t("paymentOverdue")}</p>}
          <div className="mt-3"><PaymentButton eventId={rsvp.event_id} rsvpId={rsvp.id} action="mark-sent" label={t("markSent")} working={t("working")} error={t("paymentError")} success={t("paymentSentConfirmation")} confirmation={t("paymentConfirmation")} /></div>
        </div>}

          {isPaid && rsvp.payment_status === "pending" && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-800">{t("paymentSentConfirmation")}</p>}</article>;
      }) : <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-muted">{t("noRsvps")}</p>}</div></section>
      <section className="mt-10"><h2 className="display text-2xl font-extrabold">{t("hosting")}</h2><div className="mt-4 grid gap-4">{hostedEvents?.length ? hostedEvents.map((event) => { const pending = (hostedRsvps ?? []).filter((rsvp) => rsvp.event_id === event.id && rsvp.payment_status === "pending" && rsvp.user_id !== user.id).map((rsvp) => ({ rsvpId: rsvp.rsvp_id, displayName: rsvp.display_name || rsvp.email, email: rsvp.email, amount: rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0)), dateSent: rsvp.created_at })); const cancelRequests = (hostedRsvps ?? []).filter((rsvp) => rsvp.event_id === event.id && rsvp.payment_status === "cancel_requested" && rsvp.user_id !== user.id).map((rsvp) => ({ rsvpId: rsvp.rsvp_id, displayName: rsvp.display_name || rsvp.email, email: rsvp.email, amount: rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0)), dateSent: rsvp.created_at })); const paid = (hostedRsvps ?? []).filter((rsvp) => rsvp.event_id === event.id && rsvp.payment_status === "paid" && rsvp.user_id !== user.id).map((rsvp) => ({ rsvpId: rsvp.rsvp_id, displayName: rsvp.display_name || rsvp.email, email: rsvp.email, amount: rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0)), paidAt: rsvp.paid_at })); const confirmedTotal = (hostedRsvps ?? []).filter((rsvp) => rsvp.event_id === event.id && rsvp.payment_status === "paid" && rsvp.user_id !== user.id).reduce((sum, rsvp) => sum + rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0)), 0); return <article key={event.id} className="rounded-2xl border border-line bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-bold">{event.title}</h3><p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at))} · {event.location}</p><span className="mt-2 inline-flex rounded-full bg-chip px-3 py-1 text-xs font-bold">{t(`status.${event.status}` as "status.draft")}</span></div><Link href={`/events/${event.id}/edit`} className="rounded-full border border-purple px-4 py-2 text-sm font-bold text-purple">{t("edit")}</Link></div>{event.price_cad > 0 && <PaymentConfirmationList eventId={event.id} pendingPayments={pending} confirmedTotal={confirmedTotal} labels={t.raw("organizerPayments") as never} />}{cancelRequests.length > 0 && (<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold">{t("organizerPayments.cancelRequested")}</p>{cancelRequests.map((request) => (<div key={request.rsvpId} className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{request.displayName} — ${request.amount} CAD</p><PaymentButton eventId={event.id} rsvpId={request.rsvpId} action="refund" label={t("refundPayment")} working={t("working")} error={t("paymentError")} success={t("paymentUpdated")} /></div>))}</div>)}</article>; }) : <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-muted">{t("noHosted")}</p>}</div></section>
      <section className="mt-12"><h2 className="display text-2xl font-extrabold">{t("paidSection.title")}</h2><div className="mt-4 grid gap-4">{hostedEvents?.length ? hostedEvents.map((event) => { const paid = (hostedRsvps ?? []).filter((rsvp) => rsvp.event_id === event.id && rsvp.payment_status === "paid" && rsvp.user_id !== user.id); const confirmedTotal = paid.reduce((sum, rsvp) => sum + rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0)), 0); return <article key={event.id} className="rounded-2xl border border-line bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-bold">{event.title}</h3><p className="text-sm font-bold text-green-700">{t("paidSection.confirmed", { amount: `$${confirmedTotal} CAD` })}</p></div><div className="mt-4 grid gap-3">{paid.length ? paid.map((rsvp) => { const paidDate = rsvp.paid_at ? new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }).format(new Date(rsvp.paid_at)) : "—"; return <div key={rsvp.rsvp_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4"><div><p className="font-bold">{rsvp.display_name || rsvp.email}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted"><span>{rsvp.email}</span>{rsvp.email && <CopyButton value={rsvp.email} label={t("paidSection.copy")} copiedLabel={t("paidSection.copied")} />}</div><p className="mt-1 text-sm font-bold text-ink">${rsvp.price_cad * (1 + (rsvp.plus_ones ?? 0))} CAD</p><p className="mt-1 text-xs font-bold text-green-700">{t("paidSection.paidOn", { date: paidDate })}</p></div><PaymentButton eventId={event.id} rsvpId={rsvp.rsvp_id} action="refund" label={t("refundPayment")} working={t("working")} error={t("paymentError")} success={t("paymentUpdated")} /></div>; }) : <p className="text-sm text-muted">{t("paidSection.empty")}</p>}</div></article>; }) : <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-muted">{t("paidSection.empty")}</p>}</div></section>
    </div></main>);
}