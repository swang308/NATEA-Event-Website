import { Link } from "@/i18n/navigation";

export function SiteFooter({ locale }: { locale: string }) {
  return (
    <footer className="border-t border-line bg-card py-10">
      <div className="container flex flex-wrap items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
          <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
        </Link>
        <p className="text-sm text-muted">{locale === "zh-TW" ? "在多倫多，一起學習。" : "Learn together, in Toronto."}</p>
        <div className="flex items-center gap-5 text-sm font-bold">
          <Link href="/events" className="text-ink hover:text-purple">{locale === "zh-TW" ? "活動" : "Events"}</Link>
          <a href="https://line.me/ti/g/M8agqVHJnT" target="_blank" rel="noreferrer" className="text-ink hover:text-purple">Line</a>
        </div>
      </div>
    </footer>
  );
}
