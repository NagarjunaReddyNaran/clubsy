import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PlanForm } from "@/components/admin/plan-form";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Plan</h1>
        <p className="text-gray-500 mt-1">Update plan details</p>
      </div>
      <PlanForm plan={plan} />
    </div>
  );
}
