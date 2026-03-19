import { prisma } from "@/lib/prisma";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "general",
    },
  });
}
