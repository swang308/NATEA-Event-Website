import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
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

export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params;
  await connection();
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const isChinese = locale === "zh-TW";
  const events = await getPublishedEvents();
  const filter = (await searchParams)?.filter ?? "all";
  const filteredEvents =
    filter === "workshops" ? events.filter((event) => event.category === "Workshop")
      : filter === "free" ? events.filter((event) => event.price_cad === 0)
        : filter === "paid" ? events.filter((event) => event.price_cad > 0)
          : events;


  return (
    <main>
      <section className="bg-[radial-gradient(circle_at_78%_20%,#eef6f7_0%,#fff_40%)] py-20 md:py-28">
        <div className="container grid items-center gap-14 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[.18em] text-teal-d">{t("hero.eyebrow")}</p>
            <h1 className="display max-w-2xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-7xl">{t("hero.headline")}</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted">{t("hero.intro")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#events" className="rounded-full bg-teal px-6 py-3.5 font-bold text-white transition hover:bg-teal-d">{t("hero.browse")}</a>
              <Link href="/events/new" className="rounded-full border border-purple bg-purple px-6 py-3.5 font-bold !text-white transition hover:bg-purple-d">{t("hero.host")}</Link>
            </div>
          </div>
          <div className="gradient-mix relative min-h-[310px] overflow-hidden rounded-[28px] p-8 text-white shadow-xl shadow-purple/10">
            <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full border-[18px] border-white/15" />
            <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full border-[18px] border-white/15" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">NATEA</span><span className="text-2xl">✦</span></div>
              <div><p className="display text-4xl font-extrabold">{t.rich("hero.cardTitle", { br: () => <br /> })}</p><p className="mt-5 text-white/75">{t("hero.tagline")}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="events" className="bg-bg2 py-20">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-teal-d">{t("events.eyebrow")}</p><h2 className="display text-4xl font-extrabold">{t("events.title")}</h2></div>
            <div className="flex gap-2 rounded-full bg-white p-1 text-sm font-bold shadow-sm">
              {([
                ["all", t("events.all")],
                ["workshops", t("events.workshops")],
                ["free", t("events.free")],
                ["paid", t("events.paid")],
              ] as const).map(([key, label]) => (
                <Link key={key} href={`/?filter=${key}#events`} className={`rounded-full px-4 py-2 ${filter === key ? "bg-purple !text-white" : "text-muted"}`}>
                  {label}
                </Link>
              ))}
            </div>

          </div>
          {filteredEvents.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-12 text-center"><p className="text-lg font-bold">{t("events.empty")}</p><p className="mt-2 text-muted">{t("events.emptyDescription")}</p></div>
          ) : (
            <>
              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredEvents.slice(0, 6).map((event) => <EventCard key={event.id} event={event} locale={locale} labels={t.raw("events.card") as EventCardLabels} />)}</div>
              <div className="mt-10 text-center">
                <Link href="/events" className="inline-flex rounded-full bg-purple px-6 py-3.5 font-bold !text-white transition hover:bg-purple-d">
                  {isChinese ? "瀏覽全部活動" : "Browse all events"}
                </Link>
              </div>
            </>
          )}

        </div>
      </section>


      <section id="payment" className="py-20"><div className="container"><div className="max-w-2xl"><p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-purple">{t("payment.eyebrow")}</p><h2 className="display text-4xl font-extrabold">{t("payment.title")}</h2></div><div className="mt-10 grid gap-8 md:grid-cols-4">{t.raw("payment.steps").map((step: string, i: number) => <div key={step} className="relative"><span className="display text-5xl font-extrabold text-teal/30">0{i + 1}</span><p className="mt-3 text-lg font-bold leading-snug">{step}</p></div>)}</div></div></section>

      <section id="line" className="bg-bg2 py-20">
        <div className="container grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-teal-d">{t("line.eyebrow")}</p>
            <h2 className="display text-4xl font-extrabold">{t("line.title")}</h2>
            <p className="mt-4 max-w-md text-lg leading-8 text-muted">{t("line.description")}</p>
            <a href="https://line.me/ti/g/M8agqVHJnT" target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded-full bg-[#06c755] px-6 py-3.5 font-bold text-white transition hover:opacity-90">{t("line.join")}</a>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-line bg-white p-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/line-group-qr.jpg" alt="NATEA Line group QR code" className="h-64 w-64 rounded-2xl" />
            <p className="mt-5 text-sm font-bold text-muted">{t("line.scan")}</p>
          </div>
        </div>
      </section>

    </main>
  );
}
