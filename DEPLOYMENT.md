# Clubsy — Production Deployment Guide

Complete step-by-step guide to deploy Clubsy on your own domain with minimal cost.

**Estimated monthly cost at launch: $0–$3**
(Free tiers cover everything until ~500+ active users)

---

## Table of Contents

1. [Domain Setup](#1-domain-setup)
2. [Vercel Hosting](#2-vercel-hosting)
3. [Database — Neon (already configured)](#3-database--neon)
4. [Authentication](#4-authentication)
5. [Email Service](#5-email-service)
6. [Stripe Payments](#6-stripe-payments)
7. [Background Jobs — Inngest](#7-background-jobs--inngest)
8. [Security Hardening](#8-security-hardening)
9. [Monitoring — Sentry](#9-monitoring--sentry)
10. [Full Environment Variables Reference](#10-full-environment-variables-reference)
11. [Final Production Checklist](#11-final-production-checklist)
12. [Common Errors & Fixes](#12-common-errors--fixes)
13. [Scalability Plan](#13-scalability-plan)

---

## 1. Domain Setup

### Choosing a Domain

| Provider | Cost/year | Notes |
|----------|-----------|-------|
| **Namecheap** | ~$8–12 | Best price, clean UI, recommended |
| **Porkbun** | ~$8–10 | Cheapest, includes privacy |
| **Cloudflare Registrar** | ~$8–10 | At-cost pricing, free DNS |
| Google Domains | ~$12 | Now merged into Squarespace |

**Suggested names:**
- `getclubsy.com` — clear SaaS pattern
- `clubsy.app` — modern, short
- `clubsyhq.com` — if .app/.com unavailable
- `yourclubname.app` — if building for one club

> **.app domains** require HTTPS (enforced by browsers) — perfect since Vercel handles SSL automatically.

### Connecting Domain to Vercel

1. In **Vercel Dashboard** → your project → **Settings → Domains**
2. Click **Add Domain** → enter your domain (e.g. `getclubsy.com`)
3. Vercel will show you DNS records to add. Two options:

**Option A — Vercel nameservers (recommended, simplest):**
```
In Namecheap/Porkbun → change nameservers to:
  ns1.vercel-dns.com
  ns2.vercel-dns.com
Vercel manages everything automatically including SSL.
```

**Option B — Keep your registrar's DNS, add records manually:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. SSL/HTTPS is **automatic** — Vercel provisions a Let's Encrypt certificate within minutes. No action needed.

5. Set `www` to redirect to apex (or vice versa) in Vercel's domain settings.

> DNS propagation takes 5–30 minutes. Use https://dnschecker.org to verify.

---

## 2. Vercel Hosting

### Initial Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# From your project root
vercel login
vercel --prod
```

Or connect via GitHub (recommended — enables auto-deploys):

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Vercel auto-detects Next.js — click **Deploy**

### Environment Variables in Vercel

Go to: **Project → Settings → Environment Variables**

Add every variable from [Section 10](#10-full-environment-variables-reference).

> **Critical:** Set the environment to **Production** (and optionally Preview) for each variable.

### Build Settings

Vercel auto-detects these — verify they match:

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### Post-Deploy: Run Prisma Migrate

After first deploy, run migrations against your production DB:

```bash
# From your local machine (with production DATABASE_URL)
DATABASE_URL="your-neon-production-url" npx prisma migrate deploy
```

Or add it as a Vercel build command:
```
npm run build && npx prisma migrate deploy
```

> **Do NOT run `prisma db push` in production** — always use `migrate deploy` to apply tracked migrations safely.

---

## 3. Database — Neon

> ✅ You already have Neon configured. This section covers production hardening.

### Your Current Setup
- Provider: Neon (PostgreSQL, `ep-young-king-adpqlvlz-pooler`)
- Connection pooling: already enabled (`-pooler` suffix in URL)

### Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Storage | 512 MB |
| Compute | 0.5 CPU, 1 GB RAM |
| Branches | 10 |
| Projects | 1 |
| Bandwidth | 5 GB/month |

Plenty for hundreds of active members.

### Production Hardening

1. **Use the pooled connection string** (already done — `-pooler` suffix):
   ```
   postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require
   ```

2. **Create a separate production branch** in Neon dashboard:
   - Neon → your project → **Branches → Create Branch**
   - Name it `production`
   - Get its connection string and use that as `DATABASE_URL` in Vercel

3. **Enable automated backups**: Neon free tier keeps 7-day history. Enable point-in-time restore in project settings.

4. **Connection limit**: Neon free tier allows ~100 connections. The pooler handles this — no action needed until high traffic.

### Run Migrations

```bash
# Apply all pending migrations to production
DATABASE_URL="your-neon-prod-url" npx prisma migrate deploy

# Verify schema is in sync
DATABASE_URL="your-neon-prod-url" npx prisma db pull
```

---

## 4. Authentication

### Generate a Secure Secret

```bash
# Run this and copy the output
openssl rand -base64 32
```

### Vercel Environment Variables

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<output from openssl command above>
```

> **NEXTAUTH_URL must exactly match your production domain** including `https://` and no trailing slash.

### Verify Sessions Work

After deploying:
1. Visit `https://yourdomain.com/login`
2. Sign in — you should be redirected correctly
3. Check browser DevTools → Application → Cookies — you should see `next-auth.session-token` with `Secure` and `HttpOnly` flags set automatically in production

### If Login Redirects to Wrong URL

Check that `NEXTAUTH_URL` in Vercel exactly matches the domain you're visiting. Common mistake: setting `https://www.yourdomain.com` but visiting `https://yourdomain.com` (or vice versa).

---

## 5. Email Service

### Option A — Gmail SMTP (Free, quick start)

Best for launch. Handles ~500 emails/day free.

**Setup:**
1. Go to your Google Account → **Security → 2-Step Verification** (must be enabled)
2. Go to **Security → App Passwords**
3. Select app: **Mail** → Select device: **Other** → type "Clubsy"
4. Copy the 16-character password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # The 16-char app password (no spaces)
SMTP_FROM=Clubsy <yourname@gmail.com>
CONTACT_EMAIL=yourname@gmail.com
```

> Gmail blocks "less secure apps" — App Passwords bypass this safely.

---

### Option B — Resend (Recommended for production, 3,000 emails/month free)

Better deliverability, proper SPF/DKIM, professional sender address.

1. Sign up at https://resend.com
2. Add your domain → follow DNS verification steps
3. Create an API key

**Install Resend:**
```bash
npm install resend
```

Update `src/lib/email.ts` to use Resend's SMTP relay:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM=Clubsy <noreply@yourdomain.com>
CONTACT_EMAIL=you@yourdomain.com
```

> With Resend you get a professional `noreply@yourdomain.com` sender address, which builds trust vs. a Gmail address.

---

### Option C — SendGrid (Free up to 100 emails/day)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
SMTP_FROM=Clubsy <noreply@yourdomain.com>
```

---

### Email Checklist

After configuring, verify these emails work:
- [ ] New membership activation email
- [ ] Extension approved/rejected email
- [ ] Expiry reminder (triggers via Inngest at 8AM UTC)
- [ ] Contact form confirmation email
- [ ] Contact form admin notification

---

## 6. Stripe Payments

### Step 1 — Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Click **+ Add product**

**Product 1: Starter**
- Name: `Clubsy Starter`
- Pricing: Recurring, $29.00 / month
- Click **Save product**
- Copy the **Price ID** (starts with `price_`)

**Product 2: Pro**
- Name: `Clubsy Pro`
- Pricing: Recurring, $79.00 / month
- Copy the **Price ID**

### Step 2 — Get API Keys

Go to https://dashboard.stripe.com/apikeys

```env
STRIPE_SECRET_KEY=sk_live_...       # Live secret key (never expose publicly)
STRIPE_STARTER_PRICE_ID=price_...   # From Step 1
STRIPE_PRO_PRICE_ID=price_...       # From Step 1
```

> Start with **test mode** keys (`sk_test_...`) until you're ready to go live.

### Step 3 — Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Click **Reveal** next to Signing secret → copy it

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4 — Configure Customer Portal

1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Enable the portal
3. Configure: allow plan changes, cancellation, payment method updates
4. Save

This enables the "Manage subscription" button in `/admin/billing`.

### Step 5 — Test End-to-End

Use Stripe test cards:
```
Success:  4242 4242 4242 4242  (any future date, any CVC)
Decline:  4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

Verify webhook delivery in Stripe Dashboard → Webhooks → your endpoint → Recent deliveries.

### Going Live

When ready to accept real payments:
1. Switch keys from `sk_test_` to `sk_live_` in Vercel
2. Create a new **live mode** webhook (same URL)
3. Update `STRIPE_WEBHOOK_SECRET` to the live webhook's secret

---

## 7. Background Jobs — Inngest

Inngest runs your nightly cron jobs (expiry reminders, membership expiry) and event-triggered functions (welcome emails).

### Setup

1. Sign up at https://app.inngest.com (free — 50,000 function runs/month)
2. Create a new app → name it "clubsy"
3. Go to **Manage → Keys**:
   - Copy **Event Key** → `INNGEST_EVENT_KEY`
   - Copy **Signing Key** → `INNGEST_SIGNING_KEY`

```env
INNGEST_EVENT_KEY=inngest_...
INNGEST_SIGNING_KEY=signkey-prod-...
```

### Register Your Functions

After deploying to Vercel, register your endpoint with Inngest:

1. In Inngest Dashboard → **Apps → Sync App**
2. URL: `https://yourdomain.com/api/inngest`
3. Click **Sync**

Inngest will discover your 3 functions:
- `expire-memberships` (cron: `5 0 * * *`)
- `expiry-reminders` (cron: `0 8 * * *`)
- `welcome-email` (event: `clubsy/membership.created`)

### Verify

In Inngest Dashboard → **Functions** — you should see all 3 listed as Active.

---

## 8. Security Hardening

### What's Already in Place

| Security Feature | Status |
|-----------------|--------|
| Password hashing (bcrypt) | ✅ Done |
| Zod validation on all API routes | ✅ Done |
| Role-based access (ADMIN/USER) | ✅ Done |
| Club-scoped queries (clubId filter) | ✅ Done |
| Soft delete for users | ✅ Done |
| Audit logging | ✅ Done |
| Rate limiting on register + contact | ✅ Done (in-memory) |
| Stripe webhook signature verification | ✅ Done |
| HttpOnly + Secure session cookies | ✅ Auto in prod (NextAuth) |

### Upgrade Rate Limiting to Redis (Optional, ~$0)

In-memory rate limiting resets on each Vercel function cold start. For production robustness, add Upstash Redis (free: 10,000 requests/day).

1. Sign up at https://console.upstash.com
2. Create a Redis database → choose region closest to your Vercel deployment
3. Copy REST URL and token

```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

Then install the packages:
```bash
npm install @upstash/ratelimit @upstash/redis
```

The rate limiter in `src/lib/rate-limit.ts` auto-detects these vars and switches from in-memory to Redis — no code changes needed.

### Add Cloudflare (Optional, Free)

If you use Cloudflare for DNS (Cloudflare Registrar or proxy mode):
- Automatic bot protection
- DDoS mitigation
- Free Web Application Firewall (WAF) rules
- Caching for static assets

Just add your domain to Cloudflare and point Vercel's IP. Keep SSL mode set to **Full (strict)** in Cloudflare.

### Security Headers

Add to `next.config.ts` (or `next.config.js`):

```ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

---

## 9. Monitoring — Sentry

Free tier: 5,000 errors/month — enough for production.

1. Sign up at https://sentry.io
2. Create a new project → select **Next.js**
3. Copy your DSN

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Sentry is already wired into `src/instrumentation.ts` — it activates automatically when `SENTRY_DSN` is set.

**Vercel also has built-in logs:**
- Vercel Dashboard → your project → **Logs** (real-time)
- **Analytics** tab for performance metrics (free tier available)

---

## 10. Full Environment Variables Reference

Copy this to Vercel → Settings → Environment Variables. Replace all placeholder values.

```env
# ── Database ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require&channel_binding=require

# ── NextAuth ──────────────────────────────────────────────────────
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# ── Email (Gmail example) ─────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Clubsy <yourname@gmail.com>
CONTACT_EMAIL=yourname@gmail.com

# ── Stripe ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# ── Inngest ───────────────────────────────────────────────────────
INNGEST_EVENT_KEY=inngest_...
INNGEST_SIGNING_KEY=signkey-prod-...

# ── Upstash Redis (optional, recommended) ────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ── Sentry (optional, recommended) ───────────────────────────────
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

> **Never commit `.env` to Git.** It's in `.gitignore`. Always use Vercel's env var UI for production values.

---

## 11. Final Production Checklist

Run through this before announcing your product.

### Infrastructure
- [ ] Domain purchased and pointing to Vercel
- [ ] HTTPS active (green lock in browser)
- [ ] `NEXTAUTH_URL` set to production domain in Vercel
- [ ] Neon DB production branch connected
- [ ] `npx prisma migrate deploy` run against production DB

### Authentication
- [ ] Register a new account at `/start` — works
- [ ] Login at `/login` — works, redirects to `/admin`
- [ ] Session persists on page refresh
- [ ] Sign out works

### Email
- [ ] Send a test contact form submission at `/contact`
- [ ] Check admin inbox receives notification
- [ ] Check sender receives confirmation email
- [ ] Create a membership as admin — member receives activation email

### Stripe
- [ ] `/admin/billing` loads with correct status (TRIAL)
- [ ] Click Subscribe → redirects to Stripe checkout
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Webhook fires → status changes to ACTIVE in DB
- [ ] "Manage subscription" button works → opens Stripe portal
- [ ] Switch `STRIPE_SECRET_KEY` to live key when ready

### Member Flow
- [ ] Create a membership plan at `/admin/plans`
- [ ] Player visits `/dashboard/plans` → sees plan
- [ ] Player subscribes (pay at counter or Stripe)
- [ ] Player sees active membership at `/dashboard/membership`

### Legal & Public Pages
- [ ] `/` landing page loads
- [ ] `/contact` form submits successfully
- [ ] `/privacy`, `/terms`, `/disclaimer` all load

### Monitoring
- [ ] Vercel Logs showing requests
- [ ] Sentry receiving test event (visit `/api/test-error` or trigger one manually)
- [ ] Inngest functions synced and showing Active

---

## 12. Common Errors & Fixes

### `NEXTAUTH_URL` mismatch
**Error:** Redirects to localhost or wrong domain after login
**Fix:** Ensure `NEXTAUTH_URL=https://yourdomain.com` in Vercel env vars (exact match, no trailing slash)

---

### Prisma: "Table does not exist"
**Error:** `PrismaClientKnownRequestError` on first visit
**Fix:**
```bash
DATABASE_URL="your-prod-url" npx prisma migrate deploy
```

---

### Stripe webhook 400: "No signature"
**Error:** Webhook endpoint returns 400
**Fix:** Make sure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe Dashboard → your webhook endpoint → Signing secret (not the API key)

---

### Emails not sending
**Error:** Silent failure, no emails arriving
**Fix checklist:**
1. Check `SMTP_USER` and `SMTP_PASS` are set in Vercel (not just local `.env`)
2. Gmail: confirm you used an **App Password**, not your account password
3. Check Vercel Function Logs for `Email send failed` log entries
4. Test SMTP credentials with: https://www.smtper.net

---

### Inngest functions not running
**Error:** Cron jobs not firing, no welcome emails
**Fix:**
1. Inngest Dashboard → Apps → make sure your app is synced
2. The sync URL must be `https://yourdomain.com/api/inngest`
3. Re-sync after every deploy if you change function signatures

---

### "PrismaClient is unable to run in browser"
**Error:** Build error
**Fix:** Make sure all prisma calls are in server components or API routes — never in `"use client"` files

---

### Session not persisting / logged out on refresh
**Error:** User gets logged out after page refresh
**Fix:** `NEXTAUTH_SECRET` must be set in Vercel. If it's missing, sessions can't be decrypted.

---

## 13. Scalability Plan

### When to Upgrade (and What to Pay)

| Trigger | Action | Cost |
|---------|--------|------|
| DB approaching 512 MB | Upgrade Neon to Launch ($19/mo) | $19/mo |
| >500 emails/day | Switch from Gmail to Resend ($0 to start, $20/mo paid) | $0–20/mo |
| Rate limiting drops requests | Add Upstash Redis (already in code, free 10K req/day) | $0 |
| Cron jobs missing on Vercel cold starts | Already handled by Inngest | $0 |
| >50,000 Inngest runs/month | Upgrade Inngest ($25/mo) | $25/mo |
| Response times >500ms | Enable Vercel Edge functions for API routes | $20/mo |
| Multi-instance Redis needed | Upstash paid ($10/mo) | $10/mo |

### Performance Quick Wins (No Cost)

- Admin dashboard stats use `unstable_cache` (60s TTL) — already done
- Static pages (`/`, `/privacy`, `/terms`, `/disclaimer`) are pre-rendered — already done
- Neon pooler connection string — already done
- Vercel auto-scales serverless functions — no action needed

### Growth Milestones

```
0–50 clubs:    Free tier everything. Cost = $0/mo
50–200 clubs:  Neon Launch + Resend. Cost ≈ $39/mo
200–500 clubs: Add Redis, Inngest paid. Cost ≈ $70/mo
500+ clubs:    Dedicated DB, custom infra. Cost varies.
```

---

## Cost Summary

| Service | Free Tier | Paid When |
|---------|-----------|-----------|
| Vercel | ✅ Free (Hobby) | 100GB bandwidth/mo |
| Neon DB | ✅ Free (512MB) | DB >512MB |
| Gmail SMTP | ✅ Free (500/day) | High email volume |
| Resend | ✅ Free (3K/mo) | >3,000 emails/mo |
| Stripe | ✅ No monthly fee | 2.9% + 30¢ per transaction |
| Inngest | ✅ Free (50K runs) | >50K function runs |
| Upstash Redis | ✅ Free (10K req/day) | High traffic rate limiting |
| Sentry | ✅ Free (5K errors) | >5,000 errors/mo |
| **Total** | **$0/mo** | Scales with usage |
