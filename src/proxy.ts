import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  // Let the auth API and static assets through untouched.
  if (path.startsWith("/api/auth")) return;

  // The landing page and public forecast data are accessible without sign-in.
  // Public users see: 24h forecast, zone map, tide, reservoir, alerts.
  if (path === '/' || path === '/weather' || path === '/weather/incident' || path === '/weather/subscribe' || path === '/public-report' || path === '/dashboard' || path === '/zones' || path === '/season') return;

  // Public machine-readable alert feed (same data as the /weather page).
  if (path === '/api/alerts/feed') return;

  // Cron endpoints authenticate via the CRON_SECRET query param instead of a
  // session cookie. With no CRON_SECRET configured (development), GETs fall
  // through to the route handlers, which apply their own dev policy; POSTs
  // still require a signed-in user.
  if (path === "/api/refresh" || path === "/api/ingest") {
    const secret = process.env.CRON_SECRET;
    const key = nextUrl.searchParams.get("key");
    if ((secret && key === secret) || (!secret && req.method === "GET")) return;
  }

  // Auth entry points are public for everyone so the login, signup and
  // forgot-password screens always render. Do NOT redirect signed-in users
  // to the dashboard here — they may want to switch accounts.
  if (path === "/login" || path === "/signup" || path === "/signup/citizen" || path === "/forgot-password") {
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return Response.redirect(loginUrl);
  }

  if (path.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }

  // Incidents, model accuracy and field observations are staff-only surfaces.
  // Field observations are open to analysts too.
  if (
    (path === "/incidents" || path.startsWith("/incidents/") || path === "/accuracy" || path.startsWith("/accuracy/")) &&
    req.auth?.user?.role !== "ADMIN"
  ) {
    return Response.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }
  if (
    (path === "/field-observations" || path.startsWith("/field-observations/")) &&
    req.auth?.user?.role !== "ADMIN" && req.auth?.user?.role !== "ANALYST"
  ) {
    return Response.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};