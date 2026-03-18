-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MEMBERSHIP_CREATED', 'MEMBERSHIP_CANCELLED', 'MEMBERSHIP_EXTENDED', 'PAYMENT_RECORDED', 'PLAN_CREATED', 'PLAN_UPDATED', 'USER_REGISTERED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'DATA_EXPORTED', 'DATA_IMPORTED', 'ANNOUNCEMENT_CREATED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CAD';

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
