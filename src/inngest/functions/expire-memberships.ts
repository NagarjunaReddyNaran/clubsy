import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Nightly cron: flip ACTIVE memberships whose endDate has passed to EXPIRED.
 * Scheduled at 00:05 UTC daily.
 */
export const expireMemberships = inngest.createFunction(
  { id: "expire-memberships", name: "Expire Memberships", triggers: [{ cron: "5 0 * * *" }] },
  async ({ step }) => {
    const now = new Date();

    const expired = await step.run("mark-expired", async () => {
      const result = await prisma.membership.updateMany({
        where: { status: "ACTIVE", endDate: { lt: now } },
        data: { status: "EXPIRED" },
      });
      logger.info("Expired memberships", { count: result.count });
      return result.count;
    });

    return { expiredCount: expired };
  }
);
