# Clubsy — Upgrade Roadmap

> Generated: 2026-03-18 | Based on full codebase analysis

---

## Executive Summary

**What is well built:** multi-tenant schema, Stripe checkout + webhook, Zod validation, audit logging, CSV import/export, responsive table/card UI, pagination, date filters, announcement + notification system.

**Critical gaps identified:**
- Membership status is static (not recomputed from `endDate`) → dashboards show wrong counts
- No `middleware.ts` → expired subscriptions can still access all of `/admin`
- Multi-step writes (membership + payment, extension approval) are not wrapped in DB transactions
- No background jobs → expiry reminders, email notifications never fire
- In-memory rate limiter resets on every Vercel cold start
- No security headers
- Player limit of 50 (Starter plan) is not enforced in code
- Hard delete on players destroys all payment history

---

## Priority Classification

| Label | Meaning |
|-------|---------|
| 🔴 CRITICAL | Production-breaking bug or security risk. Do now. |
| 🟠 HIGH | Material impact on reliability, correctness, or revenue. Do this week. |
| 🟡 MEDIUM | Meaningful improvement, next sprint. |
| 🟢 LOW | Backlog / polish. |

---

## Implementation Plan

---

### 🔴 Item 1 — Fix Membership Status (Dynamic from endDate)

**Problem:** `status: "ACTIVE"` is stored at creation time. Memberships whose `endDate` has passed remain `ACTIVE` in DB — no cron job flips them. Admin dashboard active counts are wrong.

**Fix:** Compound filter everywhere `status: "ACTIVE"` is queried:
```ts
// BEFORE
{ status: "ACTIVE" }

// AFTER
{ status: "ACTIVE", endDate: { gte: new Date() } }
```

**Files to update:**
- `src/app/api/admin/memberships/route.ts`
- `src/app/api/admin/players/route.ts` (memberships include)
- `src/app/admin/page.tsx` (stats queries)
- `src/app/admin/players/page.tsx`
- `src/app/dashboard/membership/page.tsx`
- `src/app/admin/memberships/page.tsx`

**Risk:** LOW | **Effort:** 2h | **Dependencies:** None

---

### 🔴 Item 2 — Subscription Enforcement Middleware

**Problem:** No `src/middleware.ts` exists. An admin with an expired trial/subscription can access all of `/admin/**` without restriction. The banner warns but does not block.

**Fix:** Create `src/middleware.ts`:
```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isSubscriptionActive } from "@/lib/subscription";

export default auth(async function middleware(req) {
  const pathname = req.nextUrl.pathname;
  const BILLING_ALLOWED = ["/admin/billing", "/admin/settings"];
  const isAdminRoute = pathname.startsWith("/admin");
  const isBillingAllowed = BILLING_ALLOWED.some((p) => pathname.startsWith(p));

  if (isAdminRoute && !isBillingAllowed && req.auth?.user?.role === "ADMIN") {
    const { subscriptionStatus, trialEndsAt } = req.auth.user;
    if (!isSubscriptionActive(subscriptionStatus ?? null, trialEndsAt ?? null)) {
      return NextResponse.redirect(new URL("/admin/billing", req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

The JWT already carries `subscriptionStatus` and `trialEndsAt` — no DB call needed.

**Risk:** MEDIUM (test thoroughly — wrong logic can lock out valid admins) | **Effort:** 2h

---

### 🔴 Item 3 — Fix Non-Transactional Multi-Step Writes

**Problem:** Membership creation + payment creation are two separate Prisma calls. If the second fails, a membership exists with no payment. Extension approval has the same bug — approval status and `endDate` update are two separate calls.

**Fix A — Wrap in `$transaction`** (immediate):
```ts
// src/app/api/admin/memberships/route.ts
await prisma.$transaction(async (tx) => {
  const membership = await tx.membership.create({ data: { ... } });
  await tx.payment.create({ data: { membershipId: membership.id, ... } });
  return membership;
});
```

**Fix B — Service layer** (proper solution, see Item 8):
```ts
// src/lib/services/membership.service.ts
export async function createMembershipWithPayment(params) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.create({ ... });
    await tx.payment.create({ ... });
    return membership;
  });
}
```

**Files:** `src/app/api/admin/memberships/route.ts`, `src/app/api/admin/extensions/[id]/route.ts`

**Risk:** LOW | **Effort:** 2h

---

### 🔴 Item 4 — Security Headers

**Problem:** No HTTP security headers on any response. Missing: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`.

**Fix:** Add to `next.config.ts`:
```ts
const nextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
};
```

**Risk:** LOW | **Effort:** 30min

---

### 🟠 Item 5 — Background Jobs with Inngest

**Problem:** Expiry reminders, email notifications, and membership reconciliation do not exist. Players receive no warning before their membership expires.

**Install:** `npm install inngest`

**Files to create:**
```
src/inngest/client.ts
src/inngest/functions/expire-memberships.ts     ← nightly cron, flips ACTIVE→EXPIRED
src/inngest/functions/expiry-reminders.ts       ← 7d + 3d before expiry: in-app + email
src/inngest/functions/welcome-email.ts          ← triggered on player/created event
src/inngest/functions/announcement-fanout.ts    ← fan out notifications on announcement
src/app/api/inngest/route.ts                    ← Inngest serve endpoint
```

**`expire-memberships.ts`:**
```ts
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

export const expireMemberships = inngest.createFunction(
  { id: "expire-memberships" },
  { cron: "0 1 * * *" },  // 1 AM UTC daily
  async () => {
    const { count } = await prisma.membership.updateMany({
      where: { status: "ACTIVE", endDate: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return { expired: count };
  }
);
```

**`expiry-reminders.ts`:**
```ts
export const sendExpiryReminders = inngest.createFunction(
  { id: "expiry-reminders" },
  { cron: "0 9 * * *" },  // 9 AM UTC daily
  async () => {
    for (const daysOut of [7, 3]) {
      const start = new Date(); start.setDate(start.getDate() + daysOut - 1);
      const end = new Date();   end.setDate(end.getDate() + daysOut);

      const memberships = await prisma.membership.findMany({
        where: { status: "ACTIVE", endDate: { gte: start, lt: end } },
        include: { user: true, plan: true },
      });

      for (const m of memberships) {
        await prisma.notification.create({
          data: {
            userId: m.userId,
            title: "Membership Expiring Soon",
            message: `Your ${m.plan.name} expires in ${daysOut} day${daysOut !== 1 ? "s" : ""}.`,
            type: "membership",
          },
        });
      }
    }
  }
);
```

**Env vars to add:**
```
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

**Risk:** LOW (additive) | **Effort:** 4h

---

### 🟠 Item 6 — DB Indexes

**Problem:** No composite indexes. Queries on `(clubId, status)`, `(status, endDate)`, `(userId, isRead)` do full table scans as data grows.

**Add to `prisma/schema.prisma`:**
```prisma
model Membership {
  @@index([clubId, status])
  @@index([status, endDate])
}
model User {
  @@index([clubId, role])
}
model Payment {
  @@index([membershipId])
  @@index([userId])
}
model Notification {
  @@index([userId, isRead])
}
model AuditLog {
  @@index([createdAt])
}
```

Then: `npx prisma migrate dev --name add_performance_indexes`

**Risk:** LOW | **Effort:** 1h

---

### 🟠 Item 7 — Soft Delete for Players

**Problem:** Deleting a player hard-deletes all their membership and payment history via cascade. Audit trail is destroyed.

**Schema change:**
```prisma
model User {
  deletedAt DateTime?
}
```

**Prisma client extension** in `src/lib/prisma.ts`:
```ts
.$extends({
  query: {
    user: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
})
```

**DELETE endpoint change:**
```ts
// BEFORE: prisma.user.delete({ where: { id } })
// AFTER:
await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
```

**Risk:** MEDIUM (schema migration) | **Effort:** 3h

---

### 🟠 Item 8 — Service Layer

**Problem:** All business logic is inline in route handlers. Multi-step operations are duplicated and fragile.

**Create:**
```
src/lib/services/
  membership.service.ts   ← createMembershipWithPayment(), cancelMembership()
  player.service.ts       ← createPlayer(), bulkImportPlayers()
  club.service.ts         ← createClub(), updateClub()
  notification.service.ts ← notifyUser(), broadcastToClub()
```

**`membership.service.ts` (core):**
```ts
export async function createMembershipWithPayment(params: {
  userId: string; planId: string; clubId: string | null;
  startDate: Date; paymentMethod?: string; paymentReference?: string; notes?: string | null;
}) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: params.planId } });
  const endDate = new Date(params.startDate);
  endDate.setDate(endDate.getDate() + plan.duration);

  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.create({
      data: {
        userId: params.userId, planId: params.planId,
        clubId: params.clubId, status: "ACTIVE",
        startDate: params.startDate, endDate,
        notes: params.notes ?? null,
      },
    });
    await tx.payment.create({
      data: {
        userId: params.userId, membershipId: membership.id,
        amount: plan.price, currency: plan.currency,
        status: "COMPLETED", method: params.paymentMethod ?? "cash",
        reference: params.paymentReference ?? null, paidAt: new Date(),
      },
    });
    return { membership, plan, endDate };
  });
}
```

**Risk:** LOW (refactor only) | **Effort:** 6h

---

### 🟠 Item 9 — Redis-Ready Rate Limiter

**Problem:** Current `Map<string, number[]>` rate limiter resets on every Vercel serverless cold start. Login endpoint is not rate-limited.

**Install (optional for prod):** `npm install @upstash/ratelimit @upstash/redis`

**Replace `src/lib/rate-limit.ts`:**
```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const limiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s") })
  : null;

export async function rateLimit(identifier: string) {
  if (!limiter) return { success: true, retryAfter: 0 }; // dev fallback
  const { success, reset } = await limiter.limit(identifier);
  return { success, retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000) };
}
```

**Note:** function is now async — update callers accordingly.

**New env vars:**
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Risk:** LOW | **Effort:** 2h

---

### 🟠 Item 10 — Monetization: Enforce Player Limits

**Problem:** Stripe plan names say "Up to 50 players" (Starter) but the player creation API does not check this.

**Add `stripePlan` to Club schema:**
```prisma
model Club {
  stripePlan String? // "STARTER" | "PRO"
}
```

**In `POST /api/admin/players`:**
```ts
const PLAN_LIMITS = { STARTER: 50, PRO: Infinity, TRIAL: 10 } as const;
const planKey = (club.stripePlan ?? club.subscriptionStatus) as keyof typeof PLAN_LIMITS;
const limit = PLAN_LIMITS[planKey] ?? 10;
const currentCount = await prisma.user.count({ where: { clubId, role: "USER", deletedAt: null } });

if (currentCount >= limit) {
  return NextResponse.json({
    error: `You've reached the ${planKey} plan limit of ${limit} players. Upgrade to add more.`
  }, { status: 403 });
}
```

**`src/lib/features.ts`** — feature flags per plan:
```ts
export const PLAN_FEATURES = {
  TRIAL:   { maxPlayers: 10,       csvExport: true, automationEmails: false },
  STARTER: { maxPlayers: 50,       csvExport: true, automationEmails: false },
  PRO:     { maxPlayers: Infinity, csvExport: true, automationEmails: true  },
} as const;
```

**Risk:** MEDIUM | **Effort:** 4h

---

### 🟠 Item 11 — Observability: Sentry + Structured Logging

**Problem:** All errors go to `console.error`. In production on Vercel, a broken webhook or failed import is invisible.

**Install:** `npm install @sentry/nextjs` then `npx @sentry/wizard@latest -i nextjs`

**`src/lib/logger.ts`:**
```ts
export const logger = {
  info:  (msg: string, meta?: object) => console.log(JSON.stringify({ level: "info", msg, ...meta, ts: new Date().toISOString() })),
  error: (msg: string, err?: unknown, meta?: object) =>
    console.error(JSON.stringify({ level: "error", msg, err: String(err), ...meta, ts: new Date().toISOString() })),
  warn:  (msg: string, meta?: object) => console.warn(JSON.stringify({ level: "warn", msg, ...meta, ts: new Date().toISOString() })),
};
```

Replace all `console.error` calls with `logger.error`. In Stripe webhook, add Sentry capture.

**New env var:** `SENTRY_DSN=...`

**Risk:** LOW | **Effort:** 3h

---

### 🟡 Item 12 — Mobile Bottom Navigation

**Problem:** Admin users on mobile must scroll back to top to navigate. No sticky bottom nav exists.

**Create `src/components/layout/bottom-nav.tsx`:**
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, DollarSign } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/memberships", label: "Members", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: DollarSign },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden safe-area-inset-bottom">
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`flex flex-col items-center py-2 text-[10px] font-medium gap-1 transition-colors ${active ? "text-blue-600" : "text-gray-500"}`}>
              <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

Add to `src/app/admin/layout.tsx`: `<BottomNav />` + add `pb-16 md:pb-0` to `<main>`.

**Risk:** LOW | **Effort:** 2h

---

### 🟡 Item 13 — Dashboard Caching

**Problem:** Admin dashboard fires 8+ Prisma queries on every page load. Notification count fires on every navigation.

**In `src/app/admin/page.tsx`:**
```ts
import { unstable_cache } from "next/cache";

const getAdminStats = unstable_cache(
  async (clubId: string) => {
    const [totalPlayers, activeMemberships, ...] = await Promise.all([...]);
    return { totalPlayers, activeMemberships, ... };
  },
  ["admin-stats"],
  { revalidate: 60, tags: ["memberships", "players"] }
);
```

Call `revalidateTag("memberships")` in membership creation/update routes.

**Risk:** LOW | **Effort:** 2h

---

### 🟡 Item 14 — Onboarding: Force JWT Refresh After Club Creation

**Problem:** After `/api/onboarding/club` creates the club, `session.user.clubId` is still `null` until next login (stale JWT). The admin layout works around this with a fresh Prisma query, but it creates inconsistency.

**Fix:** In the onboarding client component, after the API call succeeds:
```ts
const { update } = useSession();
// After club creation succeeds:
await update(); // triggers jwt callback with trigger === "update", reloads clubId
router.push("/admin");
```

**Risk:** LOW | **Effort:** 1h

---

### 🟡 Item 15 — Auto-Seed Sample Plan on Club Creation

**Problem:** New admins see an empty dashboard after onboarding. No "aha moment."

**In `POST /api/onboarding/club`**, after creating the club:
```ts
await prisma.plan.create({
  data: {
    name: "Monthly Membership",
    duration: 30,
    price: 0,
    currency: "CAD",
    features: ["Full club access"],
    isActive: true,
    clubId: club.id,
  },
});
```

Admin can then edit it with their real pricing. Seeing a plan exists immediately makes the UI feel alive.

**Risk:** LOW | **Effort:** 30min

---

## Updated Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── inngest/route.ts              ← NEW: Inngest serve endpoint
│   │   └── ... (existing routes)
│   ├── admin/
│   │   └── ... (existing pages)
│   └── dashboard/
│       └── ... (existing pages)
├── components/
│   ├── layout/
│   │   ├── bottom-nav.tsx                ← NEW: Mobile bottom navigation
│   │   └── ... (existing)
│   └── ui/
│       ├── confirm-dialog.tsx            ← EXISTS
│       └── ... (existing)
├── inngest/                              ← NEW directory
│   ├── client.ts
│   └── functions/
│       ├── expire-memberships.ts
│       ├── expiry-reminders.ts
│       ├── welcome-email.ts
│       └── announcement-fanout.ts
└── lib/
    ├── services/                         ← NEW directory
    │   ├── membership.service.ts
    │   ├── player.service.ts
    │   ├── club.service.ts
    │   └── notification.service.ts
    ├── features.ts                       ← NEW: Plan feature flags
    ├── logger.ts                         ← NEW: Structured logging
    ├── rate-limit.ts                     ← REPLACE: Redis-ready
    └── ... (existing lib files)
middleware.ts                             ← NEW (project root)
```

---

## Migration Plan (Safe Upgrade Order)

```
Step 1 — Zero-risk fixes (no schema change, no new deps):
  ✓ Item 1: Add endDate filter to ACTIVE queries
  ✓ Item 2: Create middleware.ts (subscription enforcement)
  ✓ Item 3: Wrap multi-step writes in $transaction
  ✓ Item 4: Add security headers to next.config.ts

Step 2 — Schema migration (additive columns only):
  ✓ Item 6: Add DB indexes (prisma migrate)
  ✓ Item 7: Add User.deletedAt soft delete column (prisma migrate)
  ✓ Item 10: Add Club.stripePlan column (prisma migrate)

Step 3 — New dependencies:
  ✓ Item 5: Install Inngest, create functions
  ✓ Item 9: Replace rate limiter (Upstash Redis, optional)
  ✓ Item 11: Install Sentry

Step 4 — Refactor (behavior-preserving):
  ✓ Item 8: Move logic to service layer
  ✓ Item 13: Add caching to dashboard

Step 5 — UI improvements:
  ✓ Item 12: Mobile bottom nav
  ✓ Item 14: Onboarding JWT refresh
  ✓ Item 15: Seed sample plan on club creation
```

---

## Environment Variables to Add

```env
# Inngest (background jobs)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Redis rate limiting (optional — falls back to in-memory)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Error tracking
SENTRY_DSN=https://...@sentry.io/...
```

---

## Risk Summary

| Item | Risk | Breaking Change? |
|------|------|-----------------|
| Fix membership status filter | LOW | No |
| Subscription middleware | MEDIUM | Could lock out admins — test first |
| Transactions | LOW | No |
| Security headers | LOW | No |
| Inngest jobs | LOW | No (additive) |
| DB indexes | LOW | No |
| Soft delete | MEDIUM | Schema migration required |
| Service layer | LOW | No (refactor only) |
| Redis rate limiter | LOW | Caller signature changes (async) |
| Feature gating | MEDIUM | New schema column + API behavior change |
| Sentry | LOW | No |
| Mobile bottom nav | LOW | No |
| Dashboard caching | LOW | No |
| Onboarding JWT refresh | LOW | No |
| Seed sample plan | LOW | No |
