import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

interface CreatePlayerInput {
  name: string;
  email: string;
  phone?: string | null;
  clubId: string | null;
}

export async function createPlayer(input: CreatePlayerInput) {
  const { name, email, phone, clubId } = input;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error("A user with this email already exists"), { code: "DUPLICATE_EMAIL" });

  const rawPassword = randomBytes(6).toString("hex");
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const player = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone ?? null,
      password: hashedPassword,
      role: "USER",
      emailVerified: new Date(),
      ...(clubId ? { clubId } : {}),
    },
  });

  return { player, tempPassword: rawPassword };
}

export async function softDeletePlayer(id: string, clubId?: string | null) {
  const existing = await prisma.user.findFirst({
    where: { id, role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) },
  });
  if (!existing) throw Object.assign(new Error("Player not found"), { code: "NOT_FOUND" });

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}
