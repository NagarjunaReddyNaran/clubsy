import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, getMembershipApprovedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * Triggered when a new membership is created — sends a welcome notification + email.
 * Event: clubsy/membership.created
 */
export const welcomeEmail = inngest.createFunction(
  {
    id: "welcome-email",
    name: "Welcome Email on Membership",
    triggers: [{ event: "clubsy/membership.created" }],
  },
  async ({ event, step }) => {
    const { userId, planName, endDate } = event.data as {
      userId: string;
      planName: string;
      endDate: string;
    };

    const user = await step.run("fetch-user", async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
    });

    if (!user?.email) {
      logger.warn("Welcome email skipped — no user email", { userId });
      return { skipped: true };
    }

    await step.run("create-notification", async () => {
      await prisma.notification.create({
        data: {
          userId,
          title: "Welcome to the Club!",
          message: `Your ${planName} membership is now active until ${new Date(endDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.`,
          type: "welcome",
        },
      });
    });

    await step.run("send-email", async () => {
      const formattedDate = new Date(endDate).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await sendEmail({
        to: user.email!,
        subject: `Your ${planName} membership is now active`,
        html: getMembershipApprovedEmail(user.name ?? "Member", planName, formattedDate),
      });
      logger.info("Welcome email sent", { userId, planName });
    });

    return { sent: true };
  }
);
