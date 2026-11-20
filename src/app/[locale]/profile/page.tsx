import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, ProfileFormLabels } from "@/components/ProfileForm";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  await connection();
  setRequestLocale(locale);
  const t = await getTranslations("Routes.profile");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("display_name, email, preferred_language, etransfer_email, role, avatar_url, avatar_emoji").eq("id", user.id).single();
  if (!profile) redirect(`/${locale}/login`);

  return (
    <main className="min-h-screen bg-bg2 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-line bg-card p-8 shadow-sm md:p-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
            <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
          </Link>
          <Link href="/my-events" className="font-bold text-purple">{t("back")}</Link>
        </div>
        <h1 className="display mt-10 text-4xl font-extrabold">{t("title")}</h1>
        <p className="mt-4 leading-7 text-muted">{t("description")}</p>
        <ProfileForm locale={locale} userId={user.id} email={profile.email || user.email || ""} initialDisplayName={profile.display_name} initialLanguage={profile?.preferred_language ?? locale}
          initialEtransferEmail={profile.etransfer_email} initialAvatarUrl={profile.avatar_url} initialAvatarEmoji={profile.avatar_emoji} labels={{ ...(t.raw("form") as Omit<ProfileFormLabels, "roleValue">), roleValue: profile.role === "admin" ? "admin" : "member" }} />
      </section>
    </main>
  );
}
