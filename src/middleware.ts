import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/dashboard") || path === "/welcome")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // A new artist's first visit to Home starts the welcome flow (src/app/welcome).
  // Sign-up sets welcome: "pending"; the flow sets "done" when it ends.
  if (user && path === "/dashboard" && user.user_metadata?.welcome === "pending" && user.user_metadata?.role === "artist") {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  if (path.startsWith("/admin") || path.startsWith("/dashboard/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
