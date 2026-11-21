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

  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
