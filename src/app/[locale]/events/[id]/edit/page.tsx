import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EventForm } from "@/components/EventForm";
import { createClient } from "@/lib/supabase/server";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { CancelEventButton } from "@/components/CancelEventButton";
import { connection } from "next/server";

type Props = { params: Promise<{ locale: string; id: string }> };

export const instant = false;

// Format a UTC timestamp as a Toronto-local "YYYY-MM-DDTHH:mm" string
// for datetime-local inputs. Must use America/Toronto explicitly —
// the server runs in UTC, so getTimezoneOffset() would give the wrong time.
function toTorontoInput(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function EditEventPage({ params }: Props) {
  const { locale, id } = await params;
  await connection();
  setRequestLocale(locale);
  const t = await getTranslations("Routes.editEvent");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const [{ data: event }, { data: profile }] = await Promise.all([
    supabase.from("events").select("id, title, category, starts_at, ends_at, location, location_type, meeting_url, price_cad, capacity, etransfer_email, payment_deadline, description, agenda, status, image_url, organizer_id, included_text, what_to_bring")
      .eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (!event) {
    return <main className="grid min-h-screen place-items-center bg-bg2 px-5"><section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-sm"><Link href="/" className="flex items-center justify-center gap-3">
      <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
      <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
    </Link>
      <h1 className="display mt-8 text-3xl font-extrabold">{t("notOrganizer")}</h1><p className="mt-4 text-muted">{t("notOrganizerDescription")}</p><Link href="/my-events" className="mt-8 inline-flex rounded-full bg-teal px-6 py-3.5 font-bold text-white">{t("backToMyEvents")}</Link></section></main>;
  }
  const isAdmin = profile?.role === "admin";
  const { data: cohost } = await supabase
    .from("event_cohosts")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();
  const canEdit = event.organizer_id === user.id || isAdmin || Boolean(cohost);
  if (!canEdit) {
    return <main className="grid min-h-screen place-items-center bg-bg2 px-5"><section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-sm"><Link href="/" className="flex items-center justify-center gap-3">
      <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
      <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
    </Link>
      <h1 className="display mt-8 text-3xl font-extrabold">{t("notOrganizer")}</h1><p className="mt-4 text-muted">{t("notOrganizerDescription")}</p><Link href="/my-events" className="mt-8 inline-flex rounded-full bg-teal px-6 py-3.5 font-bold text-white">{t("backToMyEvents")}</Link></section></main>;
  }

  const startsAt = toTorontoInput(event.starts_at);
  const endsAt = event.ends_at
    ? toTorontoInput(event.ends_at)
    : toTorontoInput(new Date(new Date(event.starts_at).getTime() + 2 * 60 * 60 * 1000));
  const localDeadline = event.payment_deadline ? toTorontoInput(event.payment_deadline) : null;
  return <main className="min-h-screen bg-bg2 px-4 py-10 sm:px-6"><section className="mx-auto w-full max-w-2xl rounded-2xl border border-line bg-card p-8 md:p-12"><Link href="/" className="flex items-center gap-3">
    <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
    <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
  </Link>
    <h1 className="display mt-8 text-4xl font-extrabold">{t("title")}</h1><p className="mt-4 text-muted">{t("description")}</p><EventForm eventId={id} initial={{
      title: event.title, category: event.category, startsAt, endsAt, location: event.location,
      locationType: event.location_type ?? "in_person", meetingUrl: event.meeting_url ?? null, priceCad: event.price_cad, capacity: event.capacity, etransferEmail: event.etransfer_email, paymentDeadline: localDeadline, description: event.description, includedText: event.included_text ?? null, whatToBring: event.what_to_bring ?? null, agenda: event.agenda, status: event.status, imageUrl: event.image_url
    }} labels={t.raw("form") as never} canPublish={isAdmin} /><div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">{event.status === "published" && event.organizer_id === user.id && <CancelEventButton eventId={id} label={t("cancel")} confirmation={t("cancelConfirmation")} working={t("cancelWorking")} error={t("cancelError")} />}<DeleteEventButton eventId={id} label={t("delete")} confirmation={t("deleteConfirmation")} working={t("deleteWorking")} error={t("deleteError")} /></div></section></main>;
}