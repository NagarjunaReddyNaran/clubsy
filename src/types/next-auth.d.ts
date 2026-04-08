import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      currency: string;
      clubId: string | null;
      clubName: string | null;
      subscriptionStatus: string | null;
      subscriptionPlan: string | null;
      trialEndsAt: string | null;
    } & DefaultSession["user"];
  }
}
