import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      // Admin with no club → onboarding
      const hasClub = session.user.clubId != null;
      if (!hasClub) {
        const club = await prisma.club.findUnique({ where: { adminId: session.user.id }, select: { id: true } });
        if (!club) redirect("/onboarding");
      }
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
