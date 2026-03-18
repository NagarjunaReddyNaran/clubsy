# Clubsy Setup Guide

## Quick Start

### 1. Start PostgreSQL

Using Docker (recommended):
```bash
cp .env.docker.example .env.docker   # then edit .env.docker with your passwords
docker-compose up -d
```

Or install PostgreSQL locally and create the database:
```bash
createdb clubsy
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in all values in .env — never commit this file
```

### 3. Run Database Migrations

```bash
npm run db:migrate    # Creates tables
npm run db:seed       # Seeds test data
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials (local development only)

After running `npm run db:seed`, the demo accounts are available at `http://localhost:3000`.
Credentials are shown on the login page in development mode only and are not exposed in production.

---

## Features

### Admin (`/admin`)
- Dashboard with stats, revenue, expiring memberships
- Players management
- Subscription plans (create, edit, activate/deactivate)
- Memberships (assign, view, cancel)
- Payments tracking
- Extension request approval/rejection
- Announcements management

### Player (`/dashboard`)
- Dashboard with membership status and days remaining
- Browse and subscribe to plans
- View membership details and payment history
- Request membership extensions
- Read announcements and notifications

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & Register pages
│   ├── admin/            # Admin pages
│   ├── dashboard/        # User pages
│   └── api/              # API routes
├── components/
│   ├── admin/            # Admin components
│   ├── dashboard/        # User components
│   ├── layout/           # Navbar
│   └── ui/               # Reusable UI (Button, Input, Card, Badge)
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── email.ts          # Email service
│   └── utils.ts          # Utility functions
└── types/                # TypeScript declarations
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Seed data
```

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM v6
- **Auth**: NextAuth v5 (beta) with credentials
- **Email**: Nodemailer (mock in dev, SMTP in prod)
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge, date-fns

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database
```
