import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCSV, formatDateForExport } from "@/lib/export";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await prisma.user.findMany({
    where: { role: "USER" },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { plan: { select: { name: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = players.map((p) => ({
    Name: p.name ?? "",
    Email: p.email,
    Phone: p.phone ?? "",
    "Current Plan": p.memberships[0]?.plan.name ?? "None",
    "Membership Status": p.memberships[0]?.status ?? "Inactive",
    "Membership End": formatDateForExport(p.memberships[0]?.endDate ?? null),
    "Joined Date": formatDateForExport(p.createdAt),
  }));

  const csv = toCSV(rows);

  await createAuditLog({
    userId: session.user.id,
    action: "DATA_EXPORTED",
    entityType: "players",
    details: `Exported ${players.length} players`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="players-${formatDateForExport(new Date())}.csv"`,
    },
  });
}
