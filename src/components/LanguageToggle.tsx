"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

export function LanguageToggle({ locale, label }: { locale: string; label: string }) {
  const pathname = usePathname();
  return (
    <Link href={pathname} locale={locale === "zh-TW" ? "en" : "zh-TW"} className="rounded-full border border-line px-3 py-1.5 text-sm font-bold text-ink">
      {label}
    </Link>
  );
}
