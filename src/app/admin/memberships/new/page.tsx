import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MembershipForm } from "@/components/admin/membership-form";

export default async function NewMembershipPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [players, plans] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, duration: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Membership</h1>
        <p className="text-gray-500 mt-1">Assign a plan to a player</p>
      </div>
      <MembershipForm players={players} plans={plans} />
    </div>
  );
}
