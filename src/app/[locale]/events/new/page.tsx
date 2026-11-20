import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/EventForm";
import { routing } from "@/i18n/routing";
import { connection } from "next/server";

export const instant = false;

type Props = { params: Promise<{ locale: string }> };


export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function NewEventPage({ params }: Props) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Routes.newEvent");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <main className="grid min-h-screen place-items-center bg-bg2 px-5"><section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-sm"><Link href="/" className="flex items-center gap-3">
      <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
      <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
    </Link>
      <h1 className="display mt-8 text-4xl font-extrabold">{t("title")}</h1><p className="mt-4 leading-7 text-muted">{t("loginRequired")}</p><Link href="/login" className="mt-8 inline-flex rounded-full bg-teal px-6 py-3.5 font-bold text-white">{t("login")}</Link></section></main>;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return (
    <main className="min-h-screen bg-bg2 py-10"><section className="mx-auto w-full max-w-2xl rounded-2xl border border-line bg-card p-8 shadow-sm md:p-12">
      <Link href="/" className="flex items-center gap-3">
        <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
        <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
      </Link>
      <h1 className="display mt-8 text-4xl font-extrabold">{t("title")}</h1><p className="mt-4 leading-7 text-muted">{t("description")}</p><EventForm labels={t.raw("form") as never} canPublish={profile?.role === "admin"} /><Link href="/" className="mt-6 inline-flex font-bold text-purple">{t("back")}</Link>
    </section></main>
  );
}
