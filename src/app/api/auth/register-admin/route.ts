import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { detectCurrencyFromLocale } from "@/lib/detect-currency";
import { rateLimit } from "@/lib/rate-limit";
import { RegisterAdminSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = await rateLimit(ip, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = RegisterAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const locale = req.headers.get("accept-language") ?? "";
    const currency = detectCurrencyFromLocale(locale);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: "ADMIN",
        currency,
      },
    });

    return NextResponse.json(
      { message: "Admin account created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Admin registration error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
