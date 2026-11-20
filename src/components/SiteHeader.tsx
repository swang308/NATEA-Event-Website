import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileMenu } from "@/components/MobileMenu";

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations("Home.nav");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let avatar: { avatar_url: string | null; avatar_emoji: string | null; display_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("display_name, avatar_url, avatar_emoji").eq("id", user.id).maybeSingle();
    avatar = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
          <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
          <Link href="/events" className="text-ink hover:text-purple">{t("events")}</Link>
          <Link href="/#payment" className="text-ink hover:text-purple">{t("payment")}</Link>
          <Link href="/#line" className="text-ink hover:text-purple">{t("line")}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageToggle locale={locale} label={t("language")} />
          {user ? (
            <>
              <Link href="/my-events" className="hidden text-sm font-bold text-purple lg:inline">{locale === "zh-TW" ? "我的活動" : "My Events"}</Link>
              <Link href="/profile" aria-label={t("profile")} className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-teal/15 text-lg font-bold text-teal-d">
                {avatar?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatar.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : avatar?.avatar_emoji ? avatar.avatar_emoji : (avatar?.display_name?.[0] ?? user.email?.[0] ?? "N").toUpperCase()}
              </Link>
              <span className="hidden lg:block"><LogoutButton label={t("logout")} workingLabel={t("logoutWorking")} errorLabel={t("logoutError")} /></span>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-bold text-purple sm:block">{locale === "zh-TW" ? "登入" : "Log in"}</Link>
              <Link href="/signup" className="hidden rounded-full bg-purple px-4 py-2 text-sm font-bold !text-white sm:block">{locale === "zh-TW" ? "註冊" : "Sign up"}</Link>
            </>
          )}
          <MobileMenu locale={locale} labels={{ events: t("events"), payment: t("payment"), line: t("line"), myEvents: locale === "zh-TW" ? "我的活動" : "My Events", profile: t("profile"), login: locale === "zh-TW" ? "登入" : "Log in", signup: locale === "zh-TW" ? "註冊" : "Sign up" }} user={Boolean(user)}>
            {user ? <LogoutButton label={t("logout")} workingLabel={t("logoutWorking")} errorLabel={t("logoutError")} /> : null}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
