# Clubsy — Complete Technical Documentation

> **Version:** 1.0.0 | **Last Updated:** 2026-03-18 | **Stack:** Next.js 16 · Prisma 6 · PostgreSQL · NextAuth v5

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [UI/UX Design](#6-uiux-design)
7. [Security Design](#7-security-design)
8. [Deployment Guide](#8-deployment-guide)
9. [CI/CD](#9-cicd)
10. [Scalability & Future Improvements](#10-scalability--future-improvements)
11. [Testing Strategy](#11-testing-strategy)
12. [Change Management](#12-change-management)

---

## 1. Project Overview

### What is Clubsy?

Clubsy is a **multi-tenant SaaS platform** for sports and recreational clubs to manage their membership operations. It replaces manual spreadsheets and WhatsApp groups with a clean, web-based system accessible from any device.

### Target Users

| Role | Description |
|------|-------------|
| **Admin** | Club owner or manager. Creates/manages plans, tracks payments, handles membership lifecycles, imports/exports data. One admin per club. |
| **Player** | Club member. Views their membership status, subscribes to plans, requests extensions, receives announcements. |

### Core Features

**Admin side:**
- Club setup with invite-link onboarding
- Membership plan creation (duration-based or session-based)
- Player management (add, edit, delete, bulk CSV import/export)
- Membership lifecycle management (create, renew, cancel, extend)
- Payment recording and tracking
- Announcement broadcasting to all members
- Membership extension request review (approve/reject)
- Audit trail for all key actions
- Multi-currency support (CAD, USD, INR, EUR, GBP)
- Data export to CSV
- Subscription billing via Stripe

**Player side:**
- Join club via invite link
- View active membership and expiry
- Subscribe to available plans
- Request membership extensions
- Read club announcements
- Receive in-app notifications
- Update profile (name, phone, preferred currency)

### Business Model

Clubsy operates as a **B2B SaaS** product. Each club admin pays a monthly subscription to use the platform:

| Tier | Price | Features |
|------|-------|----------|
| Starter | $29/month | Core membership management |
| Pro | $79/month | Advanced reports, priority support, unlimited players |

New clubs get a **14-day free trial** with full access. Billing is handled via Stripe. If the subscription expires, admin access is restricted until renewed.

---

## 2. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                          │
│  Admin Dashboard  │  Player Dashboard  │  Public Pages  │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                  NEXT.JS APPLICATION                     │
│                  (Vercel / Node.js)                      │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  App Router  │   │  API Routes  │   │  Middleware │ │
│  │  (Pages/UI)  │   │  (/api/*)    │   │  (Auth Guard│ │
│  └──────────────┘   └──────┬───────┘   └─────────────┘ │
│                            │                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │              NextAuth v5 (JWT Sessions)          │  │
│  └──────────────────────────┬─────────────────────--┘  │
│                             │                           │
│  ┌──────────────────────────▼──────────────────────┐   │
│  │                  Prisma ORM                     │   │
│  └──────────────────────────┬─────────────────────-┘   │
└───────────────────────────--┼───────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
┌───────▼──────┐   ┌──────────▼──────┐   ┌──────────▼────┐
│  PostgreSQL  │   │  Stripe API     │   │  SMTP Email   │
│  (Database)  │   │  (Billing)      │   │  (Nodemailer) │
└──────────────┘   └─────────────────┘   └───────────────┘
```

### Layers

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Presentation** | Next.js App Router, React 19, Tailwind CSS 4 | UI rendering, client interaction |
| **API** | Next.js Route Handlers (`/api/*`) | Business logic, data access |
| **Auth** | NextAuth v5 | Session management, route protection |
| **ORM** | Prisma 6 | Type-safe database queries |
| **Database** | PostgreSQL | Persistent data storage |
| **Billing** | Stripe | Admin subscription payments |
| **Email** | Nodemailer (SMTP) | Transactional email notifications |

### Multi-Tenant Design

Clubsy uses a **shared database, schema-per-tenant** pattern via `clubId` foreign keys:

```
Club (tenant root)
 ├── User (admin, 1 per club)
 ├── User[] (members, N per club)
 ├── Plan[] (pricing plans)
 ├── Membership[] (member subscriptions)
 ├── Announcement[]
 └── Payment[] (via Membership)
```

- Every API route filters data by `session.user.clubId`
- A user belongs to exactly one club
- An admin owns exactly one club
- There is no cross-club data access

### Request Data Flow

```
1. Browser sends request
2. Next.js Middleware checks auth (NextAuth session)
3. Route handler runs with validated session
4. Handler validates body with Zod schema
5. Prisma executes filtered DB query (WHERE clubId = ...)
6. Response returned as JSON
7. React re-renders UI
```

---

## 3. Tech Stack

### Frontend

| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.7 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.577.0 |
| Class utilities | clsx + tailwind-merge | latest |

**Rendering strategy:**
- Server Components for data-fetching pages (admin/player dashboards)
- Client Components only where interactivity is required (forms, dropdowns, search)
- `<Suspense>` boundaries around search/pagination client components

### Backend

| Concern | Technology | Notes |
|---------|-----------|-------|
| API layer | Next.js Route Handlers | Co-located with frontend |
| ORM | Prisma | 6.19.2 |
| Validation | Zod | 4.3.6 |
| Password hashing | bcryptjs | 3.0.3 |
| Rate limiting | In-memory (custom) | `src/lib/rate-limit.ts` |
| Audit logging | Custom Prisma writes | `src/lib/audit.ts` |

### Database

| Concern | Technology |
|---------|-----------|
| Engine | PostgreSQL |
| ORM | Prisma 6 |
| Migrations | `prisma migrate` |
| Seed data | `prisma db seed` (tsx) |

### Authentication

| Concern | Technology |
|---------|-----------|
| Library | NextAuth v5 (beta.30) |
| Strategy | JWT (stateless sessions) |
| Provider | Credentials (email + password) |
| Session enrichment | Role, clubId, currency, subscriptionStatus |

### Payments (Admin Billing)

| Concern | Technology |
|---------|-----------|
| Payment processor | Stripe |
| Plans | STARTER $29/mo, PRO $79/mo |
| Webhooks | `/api/stripe/webhook` |

> Note: Stripe integration is scaffolded. The club admin billing via Stripe is set up but member payment collection is currently recorded manually (cash/e-transfer).

### Email

| Concern | Technology |
|---------|-----------|
| Transport | Nodemailer (SMTP) |
| Templates | Inline HTML strings |
| Triggers | Membership activation, extension reviewed, expiry reminder |
| Dev mode | Console-only (mock) when SMTP not configured |

### Hosting

| Service | Purpose |
|---------|---------|
| Vercel | Next.js application hosting |
| Neon / Supabase / Railway | PostgreSQL database |

---

## 4. Database Design

### Entity Relationship Overview

```
Club ──── User (admin, 1:1)
     ──── User[] (members, 1:N)
     ──── Plan[] (1:N)
     ──── Membership[] (1:N)
     ──── Announcement[] (1:N)

User ──── Membership[] (1:N)
     ──── Payment[] (1:N)
     ──── ExtensionRequest[] (1:N)
     ──── Notification[] (1:N)
     ──── AuditLog[] (1:N)

Membership ──── Plan (N:1)
           ──── Payment[] (1:N)
           ──── ExtensionRequest[] (1:N)
```

### Enums

```prisma
enum Role                { ADMIN  USER }
enum MembershipStatus    { ACTIVE  EXPIRED  PENDING  CANCELLED }
enum PaymentStatus       { PENDING  COMPLETED  FAILED  REFUNDED }
enum ExtensionStatus     { PENDING  APPROVED  REJECTED }
enum SubscriptionStatus  { TRIAL  ACTIVE  EXPIRED  CANCELLED }
enum AuditAction         {
  MEMBERSHIP_CREATED  MEMBERSHIP_CANCELLED  MEMBERSHIP_EXTENDED
  PAYMENT_RECORDED    PLAN_CREATED          PLAN_UPDATED
  USER_REGISTERED     EXTENSION_APPROVED    EXTENSION_REJECTED
  DATA_EXPORTED       DATA_IMPORTED         ANNOUNCEMENT_CREATED
}
```

### Tables

#### `Club`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| name | String | Club display name |
| slug | String | Unique URL slug |
| logoUrl | String? | Optional logo image URL |
| inviteCode | String | Unique 8-char code for joining |
| adminId | String | FK → User (unique, 1:1) |
| subscriptionStatus | SubscriptionStatus | Default: TRIAL |
| trialEndsAt | DateTime? | Trial expiry |
| stripeCustomerId | String? | Stripe customer ID |
| stripeSubscriptionId | String? | Active Stripe subscription |
| currentPeriodEnd | DateTime? | Billing period end |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `slug` (unique), `inviteCode` (unique), `adminId` (unique)

---

#### `User`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| name | String? | Display name |
| email | String | Unique |
| emailVerified | DateTime? | OAuth email verification |
| image | String? | Profile image URL |
| password | String? | Bcrypt hash |
| phone | String? | Phone number |
| role | Role | Default: USER |
| currency | String | Default: CAD |
| clubId | String? | FK → Club |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `email` (unique), `clubId`

---

#### `Plan`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| name | String | Plan name |
| description | String? | Optional description |
| duration | Int | Days (e.g. 30, 90) |
| price | Decimal | Plan price |
| currency | String | Default: CAD |
| maxSessions | Int? | Null = unlimited |
| features | String[] | Feature list for display |
| isActive | Boolean | Default: true |
| clubId | String? | FK → Club |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `clubId`, `isActive`

---

#### `Membership`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| planId | String | FK → Plan |
| clubId | String? | FK → Club |
| status | MembershipStatus | Default: PENDING |
| startDate | DateTime | Membership start |
| endDate | DateTime | Membership end (startDate + plan.duration) |
| sessions | Int | Default: 0, used sessions count |
| notes | String? | Admin notes |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `userId`, `planId`, `clubId`, `status`

---

#### `Payment`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| membershipId | String | FK → Membership |
| amount | Decimal | Payment amount |
| currency | String | Default: CAD |
| status | PaymentStatus | Default: PENDING |
| method | String? | cash / credit_card / e-transfer |
| reference | String? | Receipt or reference number |
| notes | String? | Admin notes |
| paidAt | DateTime? | When payment was confirmed |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `userId`, `membershipId`, `status`, `createdAt`

---

#### `ExtensionRequest`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| membershipId | String | FK → Membership |
| days | Int | Days to extend (1–30) |
| reason | String? | Player's reason |
| status | ExtensionStatus | Default: PENDING |
| reviewedBy | String? | Admin user ID |
| reviewNote | String? | Admin response note |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `userId`, `membershipId`, `status`

---

#### `Announcement`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| title | String | Announcement title |
| content | String | Full announcement body |
| isActive | Boolean | Default: true |
| clubId | String? | FK → Club |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Indexes:** `clubId`, `isActive`

---

#### `Notification`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → User (cascade delete) |
| title | String | Short title |
| message | String | Full message |
| isRead | Boolean | Default: false |
| type | String | Default: "general" |
| createdAt | DateTime | Auto |

**Indexes:** `userId`, `isRead`

---

#### `AuditLog`

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String? | FK → User (set null on delete) |
| action | AuditAction | Enum action type |
| entityType | String? | E.g. "Membership", "Plan" |
| entityId | String? | ID of affected entity |
| details | String? | JSON or human-readable detail |
| ipAddress | String? | Request IP |
| createdAt | DateTime | Auto |

**Indexes:** `userId`, `action`, `createdAt`

---

#### NextAuth Tables

| Table | Purpose |
|-------|---------|
| `Account` | OAuth provider tokens |
| `Session` | Database sessions (not used — JWT strategy) |
| `VerificationToken` | Email verification tokens |

---

## 5. API Design

All API routes are under `/api/`. Admin routes require `session.user.role === "ADMIN"`. User routes require any authenticated session. Session data is available via `auth()` from `@/lib/auth`.

### Authentication

#### `POST /api/auth/register`
Register a new player via invite link.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secretpass",
  "phone": "+1 555 0100",
  "inviteCode": "DEMO2025"
}
```
**Response:** `201 { user: { id, name, email } }`
**Errors:** `400` validation, `429` rate limited (5 req/min per IP), `404` invalid invite code, `409` email already exists

---

#### `POST /api/auth/register-admin`
Register a new club admin.

**Body:**
```json
{
  "name": "Club Admin",
  "email": "admin@myclub.com",
  "password": "securepass"
}
```
**Response:** `201 { user: { id, name, email } }`
**Errors:** `400` validation, `429` rate limited

---

#### `GET/POST /api/auth/[...nextauth]`
NextAuth catch-all for login, logout, session.

**Login body:**
```json
{ "email": "admin@clubsy.app", "password": "admin123" }
```

---

### Admin — Club

#### `GET /api/admin/club`
Returns the admin's club details.
**Response:** `{ id, name, slug, logoUrl, inviteCode, subscriptionStatus, trialEndsAt }`

#### `PATCH /api/admin/club`
Updates club name and/or logo URL.
**Body:** `{ "name": "New Name", "logoUrl": "https://..." }`

#### `GET /api/admin/club/invite`
Returns the club's join URL.
**Response:** `{ inviteUrl: "https://clubsy.app/join/DEMO2025" }`

---

### Admin — Plans

#### `GET /api/admin/plans`
List all plans for the club.
**Response:** `Plan[]`

#### `POST /api/admin/plans`
Create a new plan.
**Body:**
```json
{
  "name": "Monthly",
  "duration": 30,
  "price": 15.00,
  "currency": "CAD",
  "maxSessions": null,
  "features": ["Unlimited court access"],
  "isActive": true
}
```
**Response:** `201 Plan`

#### `GET /api/admin/plans/[id]`
Get a single plan.

#### `PATCH /api/admin/plans/[id]`
Update plan fields.

#### `DELETE /api/admin/plans/[id]`
Deactivate or delete a plan.

---

### Admin — Players

#### `GET /api/admin/players`
List players with search and pagination.

**Query params:** `q` (search by name/email/phone), `page` (default: 1)
**Response:** `{ data: User[], total, page, pageSize }`

#### `POST /api/admin/players`
Create a new player with auto-generated temp password.

**Body:**
```json
{ "name": "John Smith", "email": "john@example.com", "phone": "+1 555 0100" }
```
**Response:** `201 { player: User, tempPassword: "a3f8b2c1d4e5" }`

#### `GET /api/admin/players/[id]`
Get a player with their memberships and payments.

#### `PATCH /api/admin/players/[id]`
Update player name and/or phone.
**Body:** `{ "name": "John Smith", "phone": "+1 555 0100" }`

#### `DELETE /api/admin/players/[id]`
Delete a player and all related data (cascade).

---

### Admin — Memberships

#### `GET /api/admin/memberships`
List all memberships.

#### `POST /api/admin/memberships`
Create a membership and a linked payment record.

**Body:**
```json
{
  "userId": "clxxxxx",
  "planId": "plan-monthly",
  "startDate": "2026-03-18",
  "paymentMethod": "cash",
  "paymentReference": "REC-001",
  "notes": "Paid in full"
}
```

#### `GET /api/admin/memberships/[id]`
Get membership detail with plan, user, payments.

#### `PATCH /api/admin/memberships/[id]`
Update membership status, sessions, notes, or endDate.
**Body:** `{ "status": "CANCELLED", "notes": "Requested cancellation" }`
**Security:** Zod `.strip()` drops any unlisted fields — only whitelisted fields reach Prisma.

---

### Admin — Announcements

#### `GET /api/admin/announcements`
List all announcements for the club.

#### `POST /api/admin/announcements`
Create an announcement and fan out Notifications to all club members.

**Body:** `{ "title": "Holiday Hours", "content": "We will be closed..." }`

#### `GET /api/admin/announcements/[id]`
Get a single announcement.

#### `PATCH /api/admin/announcements/[id]`
Update title, content, or isActive flag.

#### `DELETE /api/admin/announcements/[id]`
Delete an announcement.

---

### Admin — Extensions

#### `PATCH /api/admin/extensions/[id]`
Review an extension request.
**Body:** `{ "status": "APPROVED", "reviewNote": "Approved for medical leave" }`
- On APPROVED: extends the membership's `endDate` by `request.days`, sends email notification.
- On REJECTED: sends rejection email.

---

### Admin — Export / Import

#### `GET /api/admin/export/players`
Returns players CSV file.

#### `GET /api/admin/export/payments`
Returns payments CSV. Supports `from` and `to` query params for date filtering.

#### `GET /api/admin/export/memberships`
Returns memberships CSV.

#### `POST /api/admin/import/players`
Bulk import players from a CSV file. Columns: name, email, phone (optional).
**Response:** `{ imported, skipped, errors[], tempPasswords[] }`

#### `GET /api/admin/import/template`
Download the CSV import template.

---

### User — Profile

#### `GET /api/user/profile`
Get authenticated user's profile.
**Response:** `{ name, email, phone, currency }`

#### `PATCH /api/user/profile`
Update profile fields.
**Body:** `{ "name": "Jane Doe", "phone": "+1 555 0100", "currency": "USD" }`

---

### User — Memberships

#### `POST /api/memberships/subscribe`
Subscribe the authenticated user to a plan.
**Body:** `{ "planId": "plan-monthly" }`
**Response:** `201 Membership`

#### `POST /api/memberships/extend`
Request a membership extension.
**Body:** `{ "membershipId": "clxxxxx", "days": 7, "reason": "Medical leave" }`

---

### User — Notifications

#### `POST /api/notifications/mark-read`
Mark all of the user's notifications as read.

#### `PATCH /api/notifications/[id]/read`
Mark a single notification as read. Verifies notification belongs to authenticated user.

---

### Onboarding

#### `POST /api/onboarding/club`
Create a new club for the authenticated admin.
**Body:** `{ "name": "My Badminton Club" }`
**Response:** `201 { club: Club }`

---

### Public

#### `GET /api/join/[inviteCode]`
Look up club info by invite code. Used on the join page.
**Response:** `{ id, name, logoUrl }`

---

### Stripe

#### `POST /api/stripe/checkout`
Create a Stripe checkout session for admin billing.
**Body:** `{ "priceId": "price_xxx" }`
**Response:** `{ url: "https://checkout.stripe.com/..." }`

#### `POST /api/stripe/webhook`
Handle Stripe events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`.

---

## 6. UI/UX Design

### Navigation Structure

```
PUBLIC
  /              Landing page
  /login         Sign in
  /register      Sign up (via invite link)
  /join/[code]   Join club with invite code
  /start         Start/choose path

ONBOARDING (admin only, no club yet)
  /onboarding    Create club wizard

ADMIN (requires ADMIN role + club)
  /admin                Dashboard
  /admin/players        Player list
  /admin/players/new    Add player
  /admin/players/[id]/edit  Edit player
  /admin/plans          Plan list
  /admin/plans/new      Create plan
  /admin/plans/[id]/edit  Edit plan
  /admin/memberships    Membership list
  /admin/memberships/new  Create membership
  /admin/memberships/[id] Membership detail
  /admin/announcements  Announcements list
  /admin/announcements/new  Create announcement
  /admin/announcements/[id]/edit  Edit announcement
  /admin/extensions     Extension requests
  /admin/payments       Payment tracker
  /admin/import         Bulk player import
  /admin/audit          Audit log
  /admin/billing        Subscription management
  /admin/settings       Club settings

PLAYER (requires authentication + club)
  /dashboard            Member home
  /dashboard/plans      Browse & subscribe to plans
  /dashboard/membership Membership status
  /dashboard/membership/extend  Request extension
  /dashboard/notifications  Notification inbox
  /dashboard/profile    Profile settings
```

### Admin Screens

#### Dashboard (`/admin`)
- Stats cards: Total Players, Active Memberships, Revenue This Month, Pending Extensions
- Recent payments table
- Upcoming expiries list

#### Players (`/admin/players`)
- Search by name / email / phone (debounced 350ms)
- Date filter (joined date) — Today / 7d / 30d / All time / Custom range
- **Clear filters** button (red badge with count) when any filter is active
- Desktop: sortable table with columns Player, Phone, Current Plan, Membership Status, Joined
- Mobile: card layout
- Row actions: Edit (pencil icon, hover-reveal) | Delete (confirm dialog)
- Empty state with "Add first player" CTA or "Clear filters" if filtered

#### Plans (`/admin/plans`)
- Plan cards showing name, price, duration, status badge
- Toggle active/inactive per plan
- Edit form: name, description, duration, price, currency, max sessions, features

#### Memberships (`/admin/memberships`)
- Filter by status (Active/Expired/Pending/Cancelled)
- Detail page: membership info, payment history, extension requests
- Status update actions: Activate, Cancel, Mark Expired

#### Announcements (`/admin/announcements`)
- List with relative timestamp ("2h ago"), active/inactive badge
- Edit pencil icon per announcement
- Creating an announcement auto-notifies all club members

#### Extensions (`/admin/extensions`)
- Pending requests queue
- Approve (sets endDate + days, sends email) / Reject (sends email)

#### Payments (`/admin/payments`)
- Stats: Total Revenue, This Month, Completed count
- Search by player name/email
- Date filter with **Clear filters** button
- Table: Player, Plan, Amount, Method, Status, Date, Reference
- Mobile: compact cards

#### Settings (`/admin/settings`)
- Club name (editable)
- Logo URL with live preview
- Invite link with copy button

### Player Screens

#### Dashboard (`/dashboard`)
- Membership status card (active plan name, days remaining, progress bar)
- Unread notification badge
- Quick links to Plans and Notifications

#### Membership (`/dashboard/membership`)
- Active membership detail: plan name, start/end dates, payment history
- "Request Extension" button
- Expired state with "Browse Plans" CTA

#### Plans (`/dashboard/plans`)
- Grid of available plans with price, duration, features
- Subscribe button per plan (redirects to confirmation)

#### Notifications (`/dashboard/notifications`)
- Total + unread count
- Ordered: unread first, then by date
- Per-notification mark-read button
- "Mark all as read" button
- Relative timestamps ("5m ago", "2d ago")

#### Profile (`/dashboard/profile`)
- Editable: name, phone, currency (dropdown)
- Read-only: email
- Currency change updates app-wide formatting immediately

### Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Navbar` | `components/layout/navbar.tsx` | Fixed top bar, dual-brand "Clubsy \| Club Name", responsive, "More" dropdown for overflow admin items |
| `SubscriptionBanner` | `components/layout/subscription-banner.tsx` | Dismissible warning when trial ≤3 days or subscription expired |
| `SearchInput` | `components/ui/search-input.tsx` | Debounced search (350ms), updates `?q=` URL param, X to clear |
| `DateFilter` | `components/ui/date-filter.tsx` | Quick presets + custom date range, updates `?from=&to=` params |
| `ClearFiltersButton` | `components/ui/clear-filters-button.tsx` | Shown when any filter is active; one-click removes all filters |
| `Pagination` | `components/ui/pagination.tsx` | Page prev/next with smart ellipsis range |
| `Badge` | `components/ui/badge.tsx` | Colored status pills (success/warning/danger/default) |
| `Button` | `components/ui/button.tsx` | Consistent button with `loading` spinner prop |
| `Input` | `components/ui/input.tsx` | Labeled input with `id` + `label` props |

### Responsive Behavior

| Breakpoint | Behavior |
|-----------|---------|
| Mobile (`< md`) | Card layouts for all tables; hamburger menu; stacked filters |
| Tablet (`md`) | Table layout appears; two-column grids |
| Desktop (`lg`) | Full sidebar nav with icons only |
| Wide desktop (`xl+`) | Icons + labels visible in navbar |

---

## 7. Security Design

### Authentication

- **NextAuth v5** with JWT strategy (stateless, no DB session lookups per request)
- Sessions signed with `NEXTAUTH_SECRET` (RS256/HS256)
- Passwords hashed with **bcrypt (cost factor 10)**
- No plain-text passwords stored anywhere

### Authorization

```
Route pattern          Required condition
/admin/*               session.user.role === "ADMIN"
/onboarding/*          session.user.role === "ADMIN"
/dashboard/*           authenticated (any role)
/api/admin/*           session.user.role === "ADMIN" (checked in each handler)
/api/memberships/*     authenticated user
/api/user/*            authenticated user (data scoped to session.user.id)
```

Route protection is enforced at two levels:
1. **Middleware** (`src/middleware.ts`) — blocks before render
2. **Route handlers** — re-check session and role before any DB operation

### Multi-Tenant Data Isolation

Every admin API query includes a `clubId` filter derived from `session.user.clubId`:

```ts
// Example — players list
prisma.user.findMany({
  where: { role: "USER", clubId: session.user.clubId },
  ...
})
```

A club admin cannot access another club's data even with a valid session.

### Input Validation

All API routes use **Zod** schemas to validate incoming request bodies:

```ts
const parsed = Schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Validation failed", fieldErrors: ... }, { status: 400 });
}
```

Zod's default `.strip()` behavior silently drops any unknown keys — only explicitly whitelisted fields are passed to Prisma, preventing mass-assignment vulnerabilities.

### Rate Limiting

Registration endpoints (`/api/auth/register`, `/api/auth/register-admin`) are rate-limited:

```
Limit: 5 requests per 60 seconds per IP
Response: 429 with Retry-After header
```

The limiter uses an in-memory store (`src/lib/rate-limit.ts`). For production multi-instance deployments, replace with Redis (e.g. Upstash).

### Audit Trail

All significant admin actions are logged to the `AuditLog` table:

| Action | Trigger |
|--------|---------|
| MEMBERSHIP_CREATED | New membership created |
| MEMBERSHIP_CANCELLED | Membership cancelled |
| MEMBERSHIP_EXTENDED | Extension approved |
| PAYMENT_RECORDED | Payment created |
| PLAN_CREATED / UPDATED | Plan changes |
| USER_REGISTERED | New user registers |
| EXTENSION_APPROVED / REJECTED | Extension reviewed |
| DATA_EXPORTED / IMPORTED | CSV operations |
| ANNOUNCEMENT_CREATED | New announcement |

### Email Security

- SMTP credentials stored in environment variables only
- Nodemailer sends from a configured sender address
- Dev mode falls back to console logging (no real emails sent without SMTP config)

---

## 8. Deployment Guide

### Local Setup

**Prerequisites:** Node.js 20+, PostgreSQL 14+ (or Docker)

**Step 1 — Clone and install dependencies**
```bash
git clone <repo-url> clubsy
cd clubsy
npm install
```

**Step 2 — Environment variables**

Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
```

Required values:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clubsy"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Email (optional for local dev)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Clubsy <your@gmail.com>"

# Stripe (optional for local dev)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

**Step 3 — Start PostgreSQL**

With Docker:
```bash
docker-compose up -d
```

Or point `DATABASE_URL` at an existing PostgreSQL instance.

**Step 4 — Set up database**
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to DB (dev)
npm run db:seed        # Seed demo data
```

**Step 5 — Start development server**
```bash
npm run dev
```

Open http://localhost:3000

**Demo credentials:**
```
Admin:  admin@clubsy.app  / admin123
Player: player@clubsy.app / user123
```

---

### Production Deployment

#### 1. Database — Neon (recommended) / Supabase / Railway

**Neon:**
1. Create account at neon.tech
2. Create a new project
3. Copy connection string → set as `DATABASE_URL`
4. Run migrations:
```bash
DATABASE_URL="<prod-url>" npx prisma migrate deploy
```

#### 2. Frontend — Vercel

1. Push code to GitHub
2. Import repo at vercel.com/new
3. Set all environment variables in Project Settings → Environment Variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (set to your production domain, e.g. `https://clubsy.app`)
   - `NEXTAUTH_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `STRIPE_SECRET_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`
4. Deploy. Vercel auto-detects Next.js.

#### 3. Custom Domain

1. In Vercel: Settings → Domains → Add your domain
2. Update DNS records (A or CNAME) as instructed by Vercel
3. Update `NEXTAUTH_URL` to `https://yourdomain.com`

#### 4. Stripe Webhooks (Production)

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/stripe/webhook`
3. Events to listen: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
4. Copy the signing secret → add as `STRIPE_WEBHOOK_SECRET` env var

#### 5. Post-deploy Checklist

- [ ] Database schema applied (`prisma migrate deploy`)
- [ ] `NEXTAUTH_URL` matches actual domain
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ chars)
- [ ] Stripe keys are production keys (not `sk_test_`)
- [ ] SMTP credentials tested (send a test email)
- [ ] Rate limiting working (try 6 rapid registrations)

---

## 9. CI/CD

### GitHub Actions (Recommended Setup)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build        # Type-check + build
      - run: npm run lint

      # Vercel deploys automatically on push to main via GitHub integration
      # No explicit deploy step needed if Vercel GitHub integration is enabled
```

### Environment Separation

| Branch | Environment | Database |
|--------|-------------|----------|
| `main` | Production | Prod Neon project |
| `develop` | Preview (Vercel preview URLs) | Dev/staging Neon branch |
| feature branches | Preview | Dev Neon branch |

**Vercel Preview Deployments** are created automatically for every pull request. Set preview environment variables in Vercel Project Settings → Environment Variables (scope: Preview).

---

## 10. Scalability & Future Improvements

### Current Limitations

| Area | Current State | Improvement |
|------|--------------|-------------|
| Rate limiting | In-memory (resets on restart) | Replace with Redis/Upstash |
| Email queue | Synchronous in-request | Background job queue (BullMQ/Inngest) |
| Multi-club per user | Not supported (one club per user) | Pivot to many-to-many User ↔ Club |
| Session search | Linear DB scan | Add full-text search index (PostgreSQL `tsvector`) |
| Image storage | URL strings only | Integrate Cloudflare R2 or S3 for logo uploads |
| Notifications | In-app only | Push notifications (Web Push / Firebase) |

### Recommended Next Features

**Short-term:**
- Attendance tracking (check-in per session)
- Automated expiry emails (cron job 3 days before expiry)
- Member-facing payment receipt emails
- Admin dashboard analytics (revenue charts, churn rate)

**Medium-term:**
- Mobile app (React Native / Expo) — reuse existing API
- WhatsApp integration for announcements
- Online payment collection for members (Stripe Checkout on player side)
- Recurring membership auto-renewal

**Long-term:**
- Multi-sport support (courts, coaches, time slots)
- Coach/staff role (between Admin and Player)
- Club network (umbrella organisation with child clubs)
- Public club directory and SEO pages

### Performance Optimizations

```
1. Add database indexes on high-traffic queries:
   - payments.createdAt DESC (payments page)
   - memberships.status + clubId (dashboard stats)
   - users.email (login lookup) — already unique indexed

2. Implement Next.js caching:
   - unstable_cache() for admin dashboard stats (60s TTL)
   - revalidatePath() on mutation

3. Pagination is already implemented (skip/take)
   — ensure page sizes stay ≤ 50 rows

4. Connection pooling:
   - Use PgBouncer or Neon's built-in pooler
   - DATABASE_URL should use pooler URL for production
```

---

## 11. Testing Strategy

### Unit Tests

**Location:** `src/__tests__/`

**Current tests:** `utils.test.ts` — tests for `formatDate`, `getDaysRemaining`, `getMembershipStatusColor`

**Run:**
```bash
npm test
```

**Recommended additions:**

```
src/__tests__/
  lib/
    currency.test.ts       # formatCurrency, convertCurrency
    validations.test.ts    # Zod schema edge cases
    rate-limit.test.ts     # Rate limiter logic
    subscription.test.ts   # isSubscriptionActive edge cases
```

### Integration Tests

Test API routes against a real test database:

```ts
// Example: test player creation
describe("POST /api/admin/players", () => {
  it("returns 201 with tempPassword", async () => {
    const res = await POST("/api/admin/players", {
      body: { name: "Test", email: "test@example.com" },
      session: adminSession,
    });
    expect(res.status).toBe(201);
    expect(res.json.tempPassword).toHaveLength(12);
  });
});
```

**Recommended tool:** Vitest + `@auth/testing` or a test Prisma client pointing at a separate test DB.

### Manual QA Checklist

**Before each release:**

- [ ] Register new user via invite link
- [ ] Admin can create/edit/delete a plan
- [ ] Admin can add/edit/delete a player
- [ ] Admin can create membership and record payment
- [ ] Admin can approve/reject extension request
- [ ] Admin can create announcement → player receives notification
- [ ] Player can view membership, request extension
- [ ] Player can update profile and currency changes app-wide
- [ ] CSV import works with valid file; shows errors for invalid rows
- [ ] CSV export downloads correct data
- [ ] Clear filters button appears and works on Players and Payments pages
- [ ] SubscriptionBanner appears when trial ≤3 days
- [ ] Rate limiting: 6th register attempt returns 429
- [ ] Mobile: test all above on 375px viewport

---

## 12. Change Management

### How to Update This Document

When any of the following changes, update the corresponding section:

| Change Type | Section to Update |
|-------------|-----------------|
| New model or field | §4 Database Design |
| New API route | §5 API Design |
| New page or screen | §6 UI/UX Design |
| New dependency | §3 Tech Stack |
| New env variable | §8 Deployment Guide |
| New security measure | §7 Security Design |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-18 | Initial documentation — full system coverage |

### How to Detect Drift

Run this check periodically to find undocumented API routes:

```bash
# List all API route files
find src/app/api -name "route.ts" | sort

# Compare against §5 API Design in this document
```

---

*Generated from live codebase analysis — reflects actual implementation as of 2026-03-18.*
