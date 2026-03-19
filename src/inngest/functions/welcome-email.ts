import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Triggered when a new membership is created — sends a welcome notification.
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

    await step.run("send-welcome-notification", async () => {
      await prisma.notification.create({
        data: {
          userId,
          title: "Welcome to the Club!",
          message: `Your ${planName} membership is now active until ${new Date(endDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.`,
          type: "welcome",
        },
      });
      logger.info("Welcome notification sent", { userId, planName });
    });
  }
);
