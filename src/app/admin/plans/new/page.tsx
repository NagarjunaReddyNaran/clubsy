import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlanForm } from "@/components/admin/plan-form";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Plan</h1>
        <p className="text-gray-500 mt-1">Add a new subscription plan</p>
      </div>
      <PlanForm />
    </div>
  );
}
