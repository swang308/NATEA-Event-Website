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

  // New Google sign-up? Send them to complete their profile.
  // Returning users (account created more than 10 minutes ago) go home / next.
  if (!next) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      if (Date.now() - createdAt < 10 * 60 * 1000) {
        return NextResponse.redirect(new URL(`/${locale}/profile`, url.origin));
      }
    }
  }

  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
