import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  plan_name?: string;
  start_date?: string;
  expiry_date?: string;
  payment_status?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text) as ImportRow[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Empty or invalid CSV" }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      tempPasswords: [] as Array<{ email: string; tempPassword: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      if (!row.email) {
        results.errors.push(`Row ${lineNum}: Missing email`);
        results.skipped++;
        continue;
      }

      if (!row.name) {
        results.errors.push(`Row ${lineNum}: Missing name`);
        results.skipped++;
        continue;
      }

      const email = row.email.toLowerCase().trim();

      try {
        // Check for duplicate
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          results.errors.push(`Row ${lineNum}: ${email} already exists — skipped`);
          results.skipped++;
          continue;
        }

        // Create user with random temp password
        const rawTempPassword = randomBytes(8).toString("hex");
        const hashedPassword = await bcrypt.hash(rawTempPassword, 10);
        const clubId = session.user.clubId ?? null;
        const user = await prisma.user.create({
          data: {
            name: row.name.trim(),
            email,
            phone: row.phone?.trim() || null,
            password: hashedPassword,
            role: "USER",
            clubId,
          },
        });
        results.tempPasswords.push({ email, tempPassword: rawTempPassword });

        // If plan specified, create membership
        if (row.plan_name && row.start_date && row.expiry_date) {
          const plan = await prisma.plan.findFirst({
            where: { name: { contains: row.plan_name.trim(), mode: "insensitive" }, isActive: true },
          });

          if (plan) {
            const membership = await prisma.membership.create({
              data: {
                userId: user.id,
                planId: plan.id,
                clubId,
                status: "ACTIVE",
                startDate: new Date(row.start_date),
                endDate: new Date(row.expiry_date),
              },
            });

            // Create payment if specified
            if (row.payment_status === "paid" || row.payment_status === "COMPLETED") {
              await prisma.payment.create({
                data: {
                  userId: user.id,
                  membershipId: membership.id,
                  amount: plan.price,
                  currency: plan.currency,
                  status: "COMPLETED",
                  method: "import",
                  paidAt: new Date(row.start_date),
                },
              });
            }
          }
        }

        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${lineNum}: ${(err as Error).message}`);
        results.skipped++;
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "DATA_IMPORTED",
      entityType: "players",
      details: `Imported ${results.imported} players, skipped ${results.skipped}`,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
