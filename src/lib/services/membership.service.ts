import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "./notification.service";
import { formatDateForExport } from "@/lib/export";
import { sendEmail, getMembershipApprovedEmail, getExtensionReviewedEmail } from "@/lib/email";

interface CreateMembershipInput {
  userId: string;
  planId: string;
  clubId: string | null;
  startDate: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  adminUserId: string;
}

export async function createMembership(input: CreateMembershipInput) {
  const { userId, planId, clubId, startDate, paymentMethod, paymentReference, notes, adminUserId } =
    input;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw Object.assign(new Error("Plan not found"), { code: "PLAN_NOT_FOUND" });

  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(end.getDate() + plan.duration);

  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.membership.create({
      data: { userId, planId, clubId, status: "ACTIVE", startDate: start, endDate: end, notes: notes ?? null },
    });

    await tx.payment.create({
      data: {
        userId,
        membershipId: created.id,
        amount: plan.price,
        currency: plan.currency,
        status: "COMPLETED",
        method: paymentMethod ?? "cash",
        reference: paymentReference ?? null,
        paidAt: new Date(),
      },
    });

    return created;
  });

  await createNotification({
    userId,
    title: "Membership Activated",
    message: `Your ${plan.name} membership is active until ${formatDateForExport(end)}.`,
    type: "membership",
  });

  const member = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (member?.email) {
    await sendEmail({
      to: member.email,
      subject: `Your ${plan.name} membership is now active`,
      html: getMembershipApprovedEmail(member.name ?? "Member", plan.name, formatDateForExport(end)),
    });
  }

  await createAuditLog({
    userId: adminUserId,
    action: "MEMBERSHIP_CREATED",
    entityType: "membership",
    entityId: membership.id,
    details: `Created ${plan.name} for user ${userId}`,
  });

  return membership;
}

interface SubscribeInput {
  userId: string;
  planId: string;
  clubId: string | null;
}

export async function subscribeToPlan(input: SubscribeInput) {
  const { userId, planId, clubId } = input;

  const plan = await prisma.plan.findUnique({ where: { id: planId, isActive: true } });
  if (!plan) throw Object.assign(new Error("Plan not found"), { code: "PLAN_NOT_FOUND" });

  await prisma.membership.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  const membership = await prisma.membership.create({
    data: { userId, planId, clubId, status: "ACTIVE", startDate, endDate },
  });

  await prisma.payment.create({
    data: {
      userId,
      membershipId: membership.id,
      amount: plan.price,
      status: "PENDING",
      method: "pending",
    },
  });

  return membership;
}

interface ApproveExtensionInput {
  extensionRequestId: string;
  approved: boolean;
  reviewNote?: string;
  adminUserId: string;
}

export async function reviewExtensionRequest(input: ApproveExtensionInput) {
  const { extensionRequestId, approved, reviewNote, adminUserId } = input;

  const extensionRequest = await prisma.extensionRequest.findUnique({
    where: { id: extensionRequestId },
    include: { membership: true, user: { select: { name: true, email: true } } },
  });

  if (!extensionRequest) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
  if (extensionRequest.status !== "PENDING")
    throw Object.assign(new Error("Request already reviewed"), { code: "ALREADY_REVIEWED" });

  await prisma.$transaction(async (tx) => {
    await tx.extensionRequest.update({
      where: { id: extensionRequestId },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: adminUserId,
        reviewNote: reviewNote ?? null,
      },
    });

    if (approved) {
      const membership = extensionRequest.membership;
      const newEnd = new Date(membership.endDate);
      newEnd.setDate(newEnd.getDate() + extensionRequest.days);
      await tx.membership.update({ where: { id: membership.id }, data: { endDate: newEnd } });
    }
  });

  await createNotification({
    userId: extensionRequest.userId,
    title: approved ? "Extension Approved ✓" : "Extension Rejected",
    message: approved
      ? `Your request for a ${extensionRequest.days}-day extension has been approved.`
      : `Your request for a ${extensionRequest.days}-day extension was not approved.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
    type: "extension",
  });

  if (extensionRequest.user.email) {
    await sendEmail({
      to: extensionRequest.user.email,
      subject: approved ? "Your extension request has been approved" : "Update on your extension request",
      html: getExtensionReviewedEmail(
        extensionRequest.user.name ?? "Member",
        approved,
        extensionRequest.days,
        reviewNote
      ),
    });
  }

  await createAuditLog({
    userId: adminUserId,
    action: approved ? "EXTENSION_APPROVED" : "EXTENSION_REJECTED",
    entityType: "extension_request",
    entityId: extensionRequestId,
    details: `${approved ? "Approved" : "Rejected"} ${extensionRequest.days}-day extension for ${extensionRequest.user.name}`,
  });
}
