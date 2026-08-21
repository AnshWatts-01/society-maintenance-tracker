import { NextResponse, type NextRequest } from "next/server";
import { verifySessionJwt } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * Page-level route protection, running on the Edge runtime — this is why
 * session verification is built on Web Crypto (lib/auth/jwt.ts) rather than
 * Node's `crypto` module, which Edge middleware cannot use. API routes
 * additionally enforce auth themselves via requireUser/requireAdmin, so a
 * request that somehow bypasses this matcher is still rejected server-side.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  const session = token && secret ? await verifySessionJwt(token, secret) : null;

  const isAdminRoute = pathname.startsWith("/admin");
  const isResidentRoute = pathname.startsWith("/resident");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if ((isAdminRoute || isResidentRoute) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/resident/dashboard", request.url));
  }

  if (isResidentRoute && session && session.role !== "RESIDENT") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (isAuthPage && session) {
    const destination = session.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/resident/:path*", "/login", "/register"],
};
