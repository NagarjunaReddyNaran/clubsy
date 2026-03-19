import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isSubscriptionActive } from "@/lib/subscription";

// Routes accessible even with expired subscription
const BILLING_EXEMPT = ["/admin/billing", "/admin/settings"];

export const proxy = auth(function middleware(req) {
  const { nextUrl } = req;
  const session = req.auth;
  const pathname = nextUrl.pathname;

  // Subscription gate: admin routes only
  if (
    pathname.startsWith("/admin") &&
    !BILLING_EXEMPT.some((p) => pathname.startsWith(p)) &&
    session?.user?.role === "ADMIN"
  ) {
    const active = isSubscriptionActive(
      session.user.subscriptionStatus ?? null,
      session.user.trialEndsAt ?? null
    );
    if (!active) {
      return NextResponse.redirect(new URL("/admin/billing", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all pages except static assets and Next.js internals
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
