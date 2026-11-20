import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { getSupabaseEnv } from "./lib/supabase/env";

const handleLocale = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const intlResponse = handleLocale(request);
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          intlResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
