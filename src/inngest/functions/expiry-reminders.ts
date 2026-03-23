import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, getMembershipExpiryReminderEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * Nightly cron: send a reminder notification + email to members whose membership
 * expires within the next 7 days.
 * Scheduled at 08:00 UTC daily.
 */
export const expiryReminders = inngest.createFunction(
  { id: "expiry-reminders", name: "Expiry Reminders", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }) => {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const memberships = await step.run("find-expiring", async () => {
      return prisma.membership.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: now, lte: in7Days },
        },
        include: {
          plan: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      });
    });

    await step.run("send-reminders", async () => {
      for (const m of memberships) {
        const daysLeft = Math.ceil(
          (new Date(m.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const formattedDate = new Date(m.endDate).toLocaleDateString("en-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        await prisma.notification.create({
          data: {
            userId: m.userId,
            title: "Membership Expiring Soon",
            message: `Your ${m.plan.name} membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Contact the club to renew.`,
            type: "expiry_reminder",
          },
        });

        if (m.user.email) {
          await sendEmail({
            to: m.user.email,
            subject: `Your membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
            html: getMembershipExpiryReminderEmail(
              m.user.name ?? "Member",
              m.plan.name,
              daysLeft
            ),
          });
        }
      }
      logger.info("Expiry reminders sent", { count: memberships.length });
    });

    return { remindersSent: memberships.length };
  }
);
