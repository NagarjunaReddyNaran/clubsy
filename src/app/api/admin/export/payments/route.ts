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
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const payments = await prisma.payment.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      membership: { include: { plan: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = payments.map((p) => ({
    Date: formatDateForExport(p.createdAt),
    "Player Name": p.user.name ?? "",
    Email: p.user.email,
    Plan: p.membership.plan.name,
    Amount: Number(p.amount).toFixed(2),
    Currency: p.currency,
    Status: p.status,
    Method: p.method ?? "",
    Reference: p.reference ?? "",
    "Paid At": formatDateForExport(p.paidAt),
    Notes: p.notes ?? "",
  }));

  const csv = toCSV(rows);

  await createAuditLog({
    userId: session.user.id,
    action: "DATA_EXPORTED",
    entityType: "payments",
    details: `Exported ${payments.length} payments`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payments-${formatDateForExport(new Date())}.csv"`,
    },
  });
}
