import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCSV, formatDateForExport } from "@/lib/export";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const planId = searchParams.get("planId");

  const memberships = await prisma.membership.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(planId ? { planId } : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      plan: { select: { name: true, price: true, currency: true } },
      payments: { where: { status: "COMPLETED" }, select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = memberships.map((m) => ({
    "Player Name": m.user.name ?? "",
    Email: m.user.email,
    Phone: m.user.phone ?? "",
    Plan: m.plan.name,
    Status: m.status,
    "Start Date": formatDateForExport(m.startDate),
    "End Date": formatDateForExport(m.endDate),
    "Amount Paid": m.payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2),
    Currency: m.plan.currency,
    Sessions: m.sessions,
    Notes: m.notes ?? "",
  }));

  const csv = toCSV(rows);

  await createAuditLog({
    userId: session.user.id,
    action: "DATA_EXPORTED",
    entityType: "memberships",
    details: `Exported ${memberships.length} memberships (status: ${status ?? "all"})`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="memberships-${status ?? "all"}-${formatDateForExport(new Date())}.csv"`,
    },
  });
}
