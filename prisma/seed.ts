import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_INVITE_CODE = "DEMO2025";
const DEMO_SLUG = "downtown-badminton-club";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // ── Admin ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clubsy.app" },
    update: {},
    create: {
      email: "admin@clubsy.app",
      name: "Admin User",
      password: adminPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
      currency: "CAD",
    },
  });

  // ── Club ───────────────────────────────────────────────────
  const trialEndsAt = daysFromNow(14);
  const club = await prisma.club.upsert({
    where: { inviteCode: DEMO_INVITE_CODE },
    update: {},
    create: {
      name: "Downtown Badminton Club",
      slug: DEMO_SLUG,
      inviteCode: DEMO_INVITE_CODE,
      adminId: admin.id,
      subscriptionStatus: "TRIAL",
      trialEndsAt,
    },
  });
  console.log("Club:", club.name);

  // ── Plans ──────────────────────────────────────────────────
  const [planMonthly, planQuarterly, planSessions] = await Promise.all([
    prisma.plan.upsert({
      where: { id: "plan-monthly" },
      update: {},
      create: {
        id: "plan-monthly",
        name: "Monthly Plan",
        description: "Perfect for regular players. Full court access every day.",
        duration: 30,
        price: 1500,
        currency: "CAD",
        maxSessions: null,
        features: ["Unlimited court access", "Peak hour booking", "Equipment included", "Locker facility"],
        isActive: true,
        clubId: club.id,
      },
    }),
    prisma.plan.upsert({
      where: { id: "plan-quarterly" },
      update: {},
      create: {
        id: "plan-quarterly",
        name: "Quarterly Plan",
        description: "Best value for committed players — save 20% over monthly.",
        duration: 90,
        price: 3600,
        currency: "CAD",
        maxSessions: null,
        features: [
          "Unlimited court access",
          "Peak hour booking",
          "Equipment included",
          "Locker facility",
          "Guest passes (2/month)",
          "Priority booking",
        ],
        isActive: true,
        clubId: club.id,
      },
    }),
    prisma.plan.upsert({
      where: { id: "plan-sessions" },
      update: {},
      create: {
        id: "plan-sessions",
        name: "Session Pack",
        description: "10-session pack for occasional players. Valid 60 days.",
        duration: 60,
        price: 800,
        currency: "CAD",
        maxSessions: 10,
        features: [
          "10 court sessions",
          "Valid for 60 days",
          "Off-peak access",
          "Equipment rental discount",
        ],
        isActive: true,
        clubId: club.id,
      },
    }),
  ]);
  console.log("Plans: 3");

  // ── Players ────────────────────────────────────────────────
  const playerPassword = await bcrypt.hash("player123", 10);

  const playerDefs = [
    { email: "player@clubsy.app",    name: "Test Player",       phone: "+1-416-555-0100" },
    { email: "alex@example.com",     name: "Alex Thompson",     phone: "+1-416-555-0101" },
    { email: "sarah@example.com",    name: "Sarah Chen",        phone: "+1-647-555-0102" },
    { email: "michael@example.com",  name: "Michael Rodriguez", phone: "+1-416-555-0103" },
    { email: "emma@example.com",     name: "Emma Wilson",       phone: "+1-647-555-0104" },
    { email: "james@example.com",    name: "James Park",        phone: "+1-416-555-0105" },
    { email: "priya@example.com",    name: "Priya Sharma",      phone: "+1-905-555-0106" },
    { email: "david@example.com",    name: "David Kim",         phone: "+1-416-555-0107" },
    { email: "lisa@example.com",     name: "Lisa Johnson",      phone: "+1-647-555-0108" },
    { email: "tom@example.com",      name: "Tom Anderson",      phone: "+1-416-555-0109" },
    { email: "maya@example.com",     name: "Maya Patel",        phone: "+1-905-555-0110" },
    { email: "chris@example.com",    name: "Chris Brown",       phone: null },
    { email: "rachel@example.com",   name: "Rachel Green",      phone: "+1-416-555-0112" },
  ];

  const players: Record<string, { id: string; name: string; email: string }> = {};
  for (const def of playerDefs) {
    const p = await prisma.user.upsert({
      where: { email: def.email },
      update: { clubId: club.id },
      create: {
        email: def.email,
        name: def.name,
        phone: def.phone,
        password: playerPassword,
        role: Role.USER,
        emailVerified: new Date(),
        currency: "CAD",
        clubId: club.id,
      },
    });
    players[def.email] = { id: p.id, name: p.name ?? def.name, email: p.email };
  }
  console.log("Players:", Object.keys(players).length);

  // Helper to upsert memberships safely (avoids dup key on re-seed)
  async function upsertMembership(id: string, data: Parameters<typeof prisma.membership.create>[0]["data"]) {
    return prisma.membership.upsert({ where: { id }, update: {}, create: { id, ...data } as Parameters<typeof prisma.membership.create>[0]["data"] });
  }
  async function upsertPayment(id: string, data: Parameters<typeof prisma.payment.create>[0]["data"]) {
    return prisma.payment.upsert({ where: { id }, update: {}, create: { id, ...data } as Parameters<typeof prisma.payment.create>[0]["data"] });
  }

  // ── Memberships + Payments ─────────────────────────────────
  // Test Player — Monthly, ACTIVE
  const m1 = await upsertMembership("membership-test-player", {
    userId: players["player@clubsy.app"].id,
    planId: planMonthly.id,
    status: "ACTIVE",
    startDate: daysAgo(10),
    endDate: daysFromNow(20),
    sessions: 4,
    clubId: club.id,
  });
  await upsertPayment("payment-test-player-1", {
    userId: players["player@clubsy.app"].id,
    membershipId: m1.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "cash",
    reference: "CASH-001",
    paidAt: daysAgo(10),
    createdAt: daysAgo(10),
  });

  // Alex — Quarterly, ACTIVE
  const m2 = await upsertMembership("membership-alex", {
    userId: players["alex@example.com"].id,
    planId: planQuarterly.id,
    status: "ACTIVE",
    startDate: daysAgo(30),
    endDate: daysFromNow(60),
    sessions: 18,
    clubId: club.id,
  });
  await upsertPayment("payment-alex-1", {
    userId: players["alex@example.com"].id,
    membershipId: m2.id,
    amount: 3600,
    currency: "CAD",
    status: "COMPLETED",
    method: "credit_card",
    reference: "CC-002",
    paidAt: daysAgo(30),
    createdAt: daysAgo(30),
  });

  // Sarah — Monthly, ACTIVE
  const m3 = await upsertMembership("membership-sarah", {
    userId: players["sarah@example.com"].id,
    planId: planMonthly.id,
    status: "ACTIVE",
    startDate: daysAgo(5),
    endDate: daysFromNow(25),
    sessions: 2,
    clubId: club.id,
  });
  await upsertPayment("payment-sarah-1", {
    userId: players["sarah@example.com"].id,
    membershipId: m3.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "e-transfer",
    reference: "ET-003",
    paidAt: daysAgo(5),
    createdAt: daysAgo(5),
  });

  // Michael — Session Pack, ACTIVE
  const m4 = await upsertMembership("membership-michael", {
    userId: players["michael@example.com"].id,
    planId: planSessions.id,
    status: "ACTIVE",
    startDate: daysAgo(15),
    endDate: daysFromNow(45),
    sessions: 6,
    clubId: club.id,
  });
  await upsertPayment("payment-michael-1", {
    userId: players["michael@example.com"].id,
    membershipId: m4.id,
    amount: 800,
    currency: "CAD",
    status: "COMPLETED",
    method: "cash",
    reference: "CASH-004",
    paidAt: daysAgo(15),
    createdAt: daysAgo(15),
  });

  // Emma — Monthly, EXPIRED (ended 10 days ago)
  const m5 = await upsertMembership("membership-emma", {
    userId: players["emma@example.com"].id,
    planId: planMonthly.id,
    status: "EXPIRED",
    startDate: daysAgo(40),
    endDate: daysAgo(10),
    sessions: 12,
    clubId: club.id,
  });
  await upsertPayment("payment-emma-1", {
    userId: players["emma@example.com"].id,
    membershipId: m5.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "credit_card",
    reference: "CC-005",
    paidAt: daysAgo(40),
    createdAt: daysAgo(40),
  });

  // James — Monthly, PENDING
  const m6 = await upsertMembership("membership-james", {
    userId: players["james@example.com"].id,
    planId: planMonthly.id,
    status: "PENDING",
    startDate: daysAgo(2),
    endDate: daysFromNow(28),
    sessions: 0,
    clubId: club.id,
  });
  await upsertPayment("payment-james-1", {
    userId: players["james@example.com"].id,
    membershipId: m6.id,
    amount: 1500,
    currency: "CAD",
    status: "PENDING",
    method: "e-transfer",
    reference: null,
    paidAt: null,
    createdAt: daysAgo(2),
  });

  // Priya — Quarterly, CANCELLED
  const m7 = await upsertMembership("membership-priya", {
    userId: players["priya@example.com"].id,
    planId: planQuarterly.id,
    status: "CANCELLED",
    startDate: daysAgo(60),
    endDate: daysAgo(20),
    sessions: 8,
    clubId: club.id,
  });
  await upsertPayment("payment-priya-1", {
    userId: players["priya@example.com"].id,
    membershipId: m7.id,
    amount: 3600,
    currency: "CAD",
    status: "REFUNDED",
    method: "credit_card",
    reference: "CC-007",
    paidAt: daysAgo(60),
    createdAt: daysAgo(60),
  });

  // David — Monthly, ACTIVE (renewed)
  const m8 = await upsertMembership("membership-david", {
    userId: players["david@example.com"].id,
    planId: planMonthly.id,
    status: "ACTIVE",
    startDate: daysAgo(3),
    endDate: daysFromNow(27),
    sessions: 1,
    clubId: club.id,
  });
  await upsertPayment("payment-david-1", {
    userId: players["david@example.com"].id,
    membershipId: m8.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "cash",
    reference: "CASH-008",
    paidAt: daysAgo(3),
    createdAt: daysAgo(3),
  });
  // David also has a previous expired membership
  const m8b = await upsertMembership("membership-david-old", {
    userId: players["david@example.com"].id,
    planId: planMonthly.id,
    status: "EXPIRED",
    startDate: daysAgo(64),
    endDate: daysAgo(34),
    sessions: 14,
    clubId: club.id,
  });
  await upsertPayment("payment-david-2", {
    userId: players["david@example.com"].id,
    membershipId: m8b.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "cash",
    reference: "CASH-008B",
    paidAt: daysAgo(64),
    createdAt: daysAgo(64),
  });

  // Lisa — Session Pack, ACTIVE
  const m9 = await upsertMembership("membership-lisa", {
    userId: players["lisa@example.com"].id,
    planId: planSessions.id,
    status: "ACTIVE",
    startDate: daysAgo(20),
    endDate: daysFromNow(40),
    sessions: 7,
    clubId: club.id,
  });
  await upsertPayment("payment-lisa-1", {
    userId: players["lisa@example.com"].id,
    membershipId: m9.id,
    amount: 800,
    currency: "CAD",
    status: "COMPLETED",
    method: "e-transfer",
    reference: "ET-009",
    paidAt: daysAgo(20),
    createdAt: daysAgo(20),
  });

  // Tom — Monthly, EXPIRED (ended 45 days ago)
  const m10 = await upsertMembership("membership-tom", {
    userId: players["tom@example.com"].id,
    planId: planMonthly.id,
    status: "EXPIRED",
    startDate: daysAgo(75),
    endDate: daysAgo(45),
    sessions: 10,
    clubId: club.id,
  });
  await upsertPayment("payment-tom-1", {
    userId: players["tom@example.com"].id,
    membershipId: m10.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "credit_card",
    reference: "CC-010",
    paidAt: daysAgo(75),
    createdAt: daysAgo(75),
  });

  // Maya — Quarterly, ACTIVE
  const m11 = await upsertMembership("membership-maya", {
    userId: players["maya@example.com"].id,
    planId: planQuarterly.id,
    status: "ACTIVE",
    startDate: daysAgo(45),
    endDate: daysFromNow(45),
    sessions: 22,
    clubId: club.id,
  });
  await upsertPayment("payment-maya-1", {
    userId: players["maya@example.com"].id,
    membershipId: m11.id,
    amount: 3600,
    currency: "CAD",
    status: "COMPLETED",
    method: "credit_card",
    reference: "CC-011",
    paidAt: daysAgo(45),
    createdAt: daysAgo(45),
  });

  // Chris — No membership (Inactive)
  // (no upsert needed)

  // Rachel — Monthly, ACTIVE
  const m13 = await upsertMembership("membership-rachel", {
    userId: players["rachel@example.com"].id,
    planId: planMonthly.id,
    status: "ACTIVE",
    startDate: daysAgo(8),
    endDate: daysFromNow(22),
    sessions: 3,
    clubId: club.id,
  });
  await upsertPayment("payment-rachel-1", {
    userId: players["rachel@example.com"].id,
    membershipId: m13.id,
    amount: 1500,
    currency: "CAD",
    status: "COMPLETED",
    method: "e-transfer",
    reference: "ET-013",
    paidAt: daysAgo(8),
    createdAt: daysAgo(8),
  });

  console.log("Memberships + Payments created");

  // ── Extension Requests ──────────────────────────────────────
  await prisma.extensionRequest.upsert({
    where: { id: "ext-emma-1" },
    update: {},
    create: {
      id: "ext-emma-1",
      userId: players["emma@example.com"].id,
      membershipId: m5.id,
      days: 7,
      reason: "Was travelling for work and couldn't use the facility.",
      status: "APPROVED",
      reviewedBy: admin.id,
      reviewNote: "Approved — valid reason.",
      createdAt: daysAgo(8),
    },
  });
  await prisma.extensionRequest.upsert({
    where: { id: "ext-tom-1" },
    update: {},
    create: {
      id: "ext-tom-1",
      userId: players["tom@example.com"].id,
      membershipId: m10.id,
      days: 14,
      reason: "Had an injury and was unable to play for two weeks.",
      status: "PENDING",
      createdAt: daysAgo(3),
    },
  });
  await prisma.extensionRequest.upsert({
    where: { id: "ext-priya-1" },
    update: {},
    create: {
      id: "ext-priya-1",
      userId: players["priya@example.com"].id,
      membershipId: m7.id,
      days: 30,
      reason: "Relocating to another city — want a refund or extension.",
      status: "REJECTED",
      reviewedBy: admin.id,
      reviewNote: "Extension not applicable to cancelled memberships.",
      createdAt: daysAgo(15),
    },
  });
  console.log("Extension requests: 3");

  // ── Announcements ───────────────────────────────────────────
  const announcements = [
    {
      id: "ann-welcome",
      title: "Welcome to Downtown Badminton Club!",
      content:
        "We're thrilled to have you here. Our new membership management system makes it easy to book courts, track your sessions, and stay up-to-date with club news. See you on the court!",
      isActive: true,
      createdAt: daysAgo(30),
    },
    {
      id: "ann-tournament",
      title: "🏆 Summer Tournament Registration Open",
      content:
        "Registration for our annual Summer Doubles Tournament is now open. Limited spots available — sign up at the front desk or contact the admin. The tournament will be held on the last weekend of next month.",
      isActive: true,
      createdAt: daysAgo(2),
    },
    {
      id: "ann-schedule",
      title: "Court Schedule Update — Weekends",
      content:
        "Starting next Saturday, courts 3 and 4 will be reserved for coaching sessions from 8 AM to 12 PM. All other courts remain available for members. Peak hour booking applies as usual.",
      isActive: true,
      createdAt: daysAgo(5),
    },
    {
      id: "ann-lights",
      title: "New LED Lighting Installed",
      content:
        "We have completed the installation of energy-efficient LED lighting across all courts. You'll notice significantly better visibility, especially during evening sessions. Enjoy the improvement!",
      isActive: true,
      createdAt: daysAgo(14),
    },
    {
      id: "ann-maintenance",
      title: "Scheduled Maintenance — Jan 15",
      content:
        "The club will be closed for routine floor maintenance on January 15th from 6 AM to 2 PM. All courts will be fully operational after 2 PM. We apologize for any inconvenience.",
      isActive: false,
      createdAt: daysAgo(45),
    },
    {
      id: "ann-holiday",
      title: "Holiday Hours — Long Weekend",
      content:
        "During the upcoming long weekend, the club will operate on reduced hours: Saturday 8 AM – 6 PM, Sunday 10 AM – 4 PM, Monday (Holiday) CLOSED. Regular hours resume Tuesday.",
      isActive: false,
      createdAt: daysAgo(60),
    },
  ];

  for (const ann of announcements) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: {},
      create: { ...ann, clubId: club.id },
    });
  }
  console.log("Announcements:", announcements.length);

  // ── Notifications for Test Player ───────────────────────────
  const notifDefs = [
    { id: "notif-1", title: "Membership Activated", message: "Your Monthly Plan membership has been activated. Enjoy unlimited court access!", isRead: true, createdAt: daysAgo(10), type: "membership" },
    { id: "notif-2", title: "Payment Received", message: "We've received your payment of $15.00 for the Monthly Plan. Thank you!", isRead: true, createdAt: daysAgo(10), type: "payment" },
    { id: "notif-3", title: "New Announcement", message: "Court Schedule Update — Weekends: Courts 3 & 4 reserved for coaching Sat mornings.", isRead: true, createdAt: daysAgo(5), type: "announcement" },
    { id: "notif-4", title: "New Announcement", message: "Summer Tournament Registration is now open. Limited spots available!", isRead: true, createdAt: daysAgo(2), type: "announcement" },
    { id: "notif-5", title: "New Announcement", message: "New LED lighting installed across all courts — better visibility for evening sessions.", isRead: true, createdAt: daysAgo(14), type: "announcement" },
    { id: "notif-6", title: "Membership Expiring Soon", message: "Your Monthly Plan membership expires in 20 days. Renew now to keep your access.", isRead: false, createdAt: daysAgo(1), type: "membership" },
    { id: "notif-7", title: "Session Recorded", message: "4 sessions recorded on your current membership. 0 sessions remaining (unlimited).", isRead: false, createdAt: daysAgo(3), type: "session" },
    { id: "notif-8", title: "New Announcement", message: "Welcome to Downtown Badminton Club! Your membership is now active.", isRead: false, createdAt: daysAgo(30), type: "announcement" },
    { id: "notif-9", title: "Profile Updated", message: "Your profile information has been updated successfully.", isRead: false, createdAt: daysAgo(0), type: "general" },
    { id: "notif-10", title: "Court Booking Reminder", message: "Peak hour courts are available tomorrow from 6–9 PM. Book early to secure your spot!", isRead: false, createdAt: daysAgo(0), type: "general" },
  ];

  for (const n of notifDefs) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: { ...n, userId: players["player@clubsy.app"].id },
    });
  }
  console.log("Notifications:", notifDefs.length);

  // ── Audit Logs ──────────────────────────────────────────────
  const auditEntries = [
    { action: "PLAN_CREATED",        details: "Created plan: Monthly Plan",                        createdAt: daysAgo(90) },
    { action: "PLAN_CREATED",        details: "Created plan: Quarterly Plan",                      createdAt: daysAgo(90) },
    { action: "PLAN_CREATED",        details: "Created plan: Session Pack",                        createdAt: daysAgo(90) },
    { action: "USER_REGISTERED",     details: `Player registered: ${players["alex@example.com"].name}`,   createdAt: daysAgo(75) },
    { action: "USER_REGISTERED",     details: `Player registered: ${players["sarah@example.com"].name}`,  createdAt: daysAgo(70) },
    { action: "USER_REGISTERED",     details: `Player registered: ${players["maya@example.com"].name}`,   createdAt: daysAgo(65) },
    { action: "MEMBERSHIP_CREATED",  details: "Quarterly Plan membership created for Maya Patel",  createdAt: daysAgo(45) },
    { action: "PAYMENT_RECORDED",    details: "Payment $36.00 CAD recorded — Alex Thompson",       createdAt: daysAgo(30) },
    { action: "USER_REGISTERED",     details: `Player registered: ${players["emma@example.com"].name}`,   createdAt: daysAgo(40) },
    { action: "MEMBERSHIP_CREATED",  details: "Monthly Plan membership created for Emma Wilson",   createdAt: daysAgo(40) },
    { action: "MEMBERSHIP_CANCELLED", details: "Quarterly Plan membership cancelled — Priya Sharma", createdAt: daysAgo(20) },
    { action: "EXTENSION_APPROVED",  details: "7-day extension approved for Emma Wilson",          createdAt: daysAgo(8) },
    { action: "USER_REGISTERED",     details: `Player registered: ${players["rachel@example.com"].name}`, createdAt: daysAgo(8) },
    { action: "MEMBERSHIP_CREATED",  details: "Monthly Plan membership created for Rachel Green",  createdAt: daysAgo(8) },
    { action: "PAYMENT_RECORDED",    details: "Payment $15.00 CAD recorded — Test Player",         createdAt: daysAgo(10) },
    { action: "ANNOUNCEMENT_CREATED", details: "Announcement published: Summer Tournament Registration", createdAt: daysAgo(2) },
    { action: "DATA_EXPORTED",       details: "Players list exported to CSV",                      createdAt: daysAgo(1) },
    { action: "MEMBERSHIP_EXTENDED", details: "Membership extended 7 days — Emma Wilson",          createdAt: daysAgo(7) },
    { action: "PLAN_UPDATED",        details: "Plan updated: Session Pack — description revised",  createdAt: daysAgo(5) },
    { action: "EXTENSION_REJECTED",  details: "Extension request rejected — Priya Sharma",         createdAt: daysAgo(15) },
  ] as const;

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    await prisma.auditLog.upsert({
      where: { id: `audit-seed-${i + 1}` },
      update: {},
      create: {
        id: `audit-seed-${i + 1}`,
        userId: admin.id,
        action: entry.action,
        details: entry.details,
        entityType: "seed",
        createdAt: entry.createdAt,
      },
    });
  }
  console.log("Audit logs:", auditEntries.length);

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n✓ Seed completed!");
  console.log("\nCredentials:");
  console.log("  Admin:  admin@clubsy.app  / admin123");
  console.log("  Player: player@clubsy.app / user123");
  console.log("  Others: any @example.com  / player123");
  console.log("\nClub:");
  console.log("  Name:      Downtown Badminton Club");
  console.log("  Invite:    http://localhost:3000/join/" + DEMO_INVITE_CODE);
  console.log("  Trial:     " + trialEndsAt.toDateString());
  console.log("\nData seeded:");
  console.log("  Players:    ", playerDefs.length);
  console.log("  Plans:       3");
  console.log("  Memberships: 14");
  console.log("  Payments:    14");
  console.log("  Extensions:  3");
  console.log("  Announcements:", announcements.length);
  console.log("  Notifications:", notifDefs.length);
  console.log("  Audit logs:  ", auditEntries.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
