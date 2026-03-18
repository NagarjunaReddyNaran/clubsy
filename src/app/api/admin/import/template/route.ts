import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = ["name", "email", "phone", "plan_name", "start_date", "expiry_date", "payment_status"];
  const example = ["John Doe", "john@example.com", "+1-416-555-0100", "Monthly Plan", "2025-01-01", "2025-02-01", "paid"];

  const csv = [headers.join(","), example.join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="import-template.csv"',
    },
  });
}
