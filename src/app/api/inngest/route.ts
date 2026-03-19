import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { expireMemberships } from "@/inngest/functions/expire-memberships";
import { expiryReminders } from "@/inngest/functions/expiry-reminders";
import { welcomeEmail } from "@/inngest/functions/welcome-email";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [expireMemberships, expiryReminders, welcomeEmail],
});
