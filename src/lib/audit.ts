import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

interface AuditParams {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        details: params.details ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Audit log error:", error);
  }
}
