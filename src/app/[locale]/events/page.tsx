import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EventCard, EventCardLabels } from "@/components/EventCard";
import { getPublishedEvents } from "@/lib/events";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ filter?: string }>;
};


export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function EventsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Routes.events");
  const isChinese = locale === "zh-TW";
  const events = await getPublishedEvents();
  const filter = (await searchParams)?.filter ?? "all";
  const filteredEvents =
    filter === "workshops" ? events.filter((event) => event.category === "Workshop")
      : filter === "free" ? events.filter((event) => event.price_cad === 0)
        : filter === "paid" ? events.filter((event) => event.price_cad > 0)
          : events;


  return (
    <main className="min-h-screen bg-bg2 py-10">
      <div className="container">
        <Link href="/" className="flex items-center gap-3">
          <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
          <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
        </Link>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
          <div><p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-teal-d">{t("eyebrow")}</p><h1 className="display text-4xl font-extrabold">{t("title")}</h1></div>
          <div className="flex gap-2 rounded-full bg-white p-1 text-sm font-bold shadow-sm">
            {([
              ["all", isChinese ? "全部" : "All"],
              ["workshops", isChinese ? "工作坊" : "Workshops"],
              ["free", isChinese ? "免費" : "Free"],
              ["paid", isChinese ? "付費" : "Paid"],
            ] as const).map(([key, label]) => (
              <Link key={key} href={`/events?filter=${key}`} className={`rounded-full px-4 py-2 ${filter === key ? "bg-purple !text-white" : "text-muted"}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line bg-card p-12 text-center"><p className="text-lg font-bold">{t("empty")}</p><p className="mt-2 text-muted">{t("emptyDescription")}</p></div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredEvents.map((event) => <EventCard key={event.id} event={event} locale={locale} labels={t.raw("card") as EventCardLabels} />)}</div>
        )}
      </div>
    </main>
  );
}
