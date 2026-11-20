import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminReviewButton } from "@/components/AdminReviewButton";

type Props = { params: Promise<{ locale: string }> };

export const instant = false;

export default async function AdminEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${locale}`);
  const { data: events } = await supabase.from("events").select("id, title, starts_at, location, organizer_id, created_at").eq("status", "pending").order("created_at", { ascending: true });
  return <main className="min-h-screen bg-bg2 py-10">
    <div className="container"><Link href="/" className="flex items-center gap-3">
      <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
      <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
    </Link>
      <h1 className="display mt-10 text-4xl font-extrabold">{t("title")}</h1><p className="mt-2 text-muted">{t("description")}</p><div className="mt-8 grid gap-4">{events?.length ? events.map((event) => <article key={event.id} className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-card p-5"><div><h2 className="font-bold">{event.title}</h2><p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at))} · {event.location}</p></div><AdminReviewButton eventId={event.id} approveLabel={t("approve")} rejectLabel={t("reject")} reasonPlaceholder={t("reasonPlaceholder")} working={t("working")} error={t("error")} /></article>) : <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-muted">{t("empty")}</p>}</div></div></main>;
}
