import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = { request: Request };

export async function GET(request: Props["request"]) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const locale = url.pathname.split("/")[1] || "en";
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_callback`, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_callback`, url.origin));
  }

  // New user? Send them to complete their profile.
  // Returning users (profile already has a display name) go home / next.
  if (!next) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.display_name) {
        return NextResponse.redirect(new URL(`/${locale}/profile`, url.origin));
      }
    }
  }

  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
