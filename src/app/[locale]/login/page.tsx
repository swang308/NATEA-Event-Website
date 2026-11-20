import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm, AuthFormLabels } from "@/components/AuthForm";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };
export const instant = false;
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }
export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Routes.login");
  return (
    <main className="grid min-h-screen place-items-center bg-bg2 px-5">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
          <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
        </Link>

        <h1 className="display mt-8 text-4xl font-extrabold">{t("title")}</h1>
        <p className="mt-4 leading-7 text-muted">{t("description")}</p>
        <AuthForm mode="login" locale={locale} labels={t.raw("form") as AuthFormLabels} />
        <Link href="/" className="mt-6 inline-flex font-bold text-purple">{t("back")}</Link>
      </section>
    </main>
  );
}
