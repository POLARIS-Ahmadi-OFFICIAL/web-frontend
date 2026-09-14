import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function hasAuthBypass(request: NextRequest) {
  return (
    request.cookies.get("polaris_dev_bypass")?.value === "1" ||
    request.cookies.get("polaris_desktop")?.value === "1"
  );
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const bypass = hasAuthBypass(request);

  if (pathname === "/") {
    const redirect = request.nextUrl.clone();
    redirect.pathname = bypass ? "/home" : "/login";
    return NextResponse.redirect(redirect);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Desktop (and the dev bypass) never talk to Supabase — even if URL/key
  // happen to be baked in — so a request never blocks on reaching it.
  if (!url || !key || bypass) {
    if (!isPublicPath(pathname) && !bypass) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      if (pathname !== "/login") {
        redirect.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(redirect);
    }
    if (bypass && pathname === "/login") {
      const redirect = request.nextUrl.clone();
      redirect.pathname = request.nextUrl.searchParams.get("next") || "/home";
      redirect.searchParams.delete("next");
      return NextResponse.redirect(redirect);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(pathname);

  if (!user && !isPublic && !hasAuthBypass(request)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if ((user || hasAuthBypass(request)) && pathname === "/login") {
    const redirect = request.nextUrl.clone();
    redirect.pathname = request.nextUrl.searchParams.get("next") || "/home";
    redirect.searchParams.delete("next");
    return NextResponse.redirect(redirect);
  }

  return response;
}
