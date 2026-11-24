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
  // First login: created_at and last_sign_in_at are within ~2 minutes of each other.
  // Returning login: last_sign_in_at is well after created_at.
  if (!next) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      const isNewUser =
        Date.now() - createdAt < 10 * 60 * 1000 &&
        Math.abs(lastSignIn - createdAt) < 2 * 60 * 1000;

      if (isNewUser) {
        return NextResponse.redirect(new URL(`/${locale}/profile`, url.origin));
      }
    }
  }

  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
