import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

// Refreshes the Supabase auth token on every request that isn't a static
// asset (see the matcher in middleware.ts) and keeps the cookie in sync on
// both the incoming request and the outgoing response.
export async function updateSession(request: NextRequest) {
  if (!supabaseConfigurado()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this call refreshes the session and must run before any
  // other code that reads it, or users get randomly logged out.
  await supabase.auth.getUser();

  return supabaseResponse;
}
