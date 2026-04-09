import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  duration: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
  currency: z.enum(["CAD", "USD", "INR", "EUR", "GBP"]).default("CAD"),
  maxSessions: z.coerce.number().int().positive().optional().nullable(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  slotAccess: z.boolean().default(false),
  maxBookingsPerWeek: z.coerce.number().int().positive().optional().nullable(),
  maxActiveBookings: z.coerce.number().int().positive().optional().nullable(),
});

export const CreateMembershipSchema = z.object({
  userId: z.string().cuid(),
  planId: z.string().cuid(),
  startDate: z.string().min(1),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export const PatchMembershipSchema = z.object({
  status: z.enum(["ACTIVE", "EXPIRED", "PENDING", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
  sessions: z.number().int().min(0).optional(),
  endDate: z.string().optional(),
});

export const PatchAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const SubscribeSchema = z.object({ planId: z.string().cuid() });

export const ExtendSchema = z.object({
  membershipId: z.string().cuid(),
  days: z.number().int().min(1).max(30),
  reason: z.string().optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
  currency: z.enum(["CAD", "USD", "INR", "EUR", "GBP"]).optional(),
});

export const RegisterAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export const CreateClubSchema = z.object({
  name: z.string().min(2).max(100),
});

export const UpdateClubSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export const CreatePlayerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
});

export const UpdatePlayerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
});

export const ContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.enum(["general", "support", "billing"]).default("general"),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export const JoinClubSchema = z.object({
  inviteCode: z.string().min(4),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

// ── Booking System ──────────────────────────────────────────────────────────

export const CreateSlotSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  capacity: z.coerce.number().int().min(1).max(500).default(8),
  isActive: z.boolean().default(true),
});

export const UpdateSlotSchema = CreateSlotSchema.partial();

export const CreateBookingSchema = z.object({
  slotId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});
