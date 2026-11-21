import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

type Props = { params: Promise<{ locale: string }> };
export const instant = false;
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Routes.resetPassword");
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("description")}</p>
      <ResetPasswordForm locale={locale} labels={t.raw() as any} />
    </main>
  );
}
