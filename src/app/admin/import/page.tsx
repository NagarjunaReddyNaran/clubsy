import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportPlayersForm } from "@/components/admin/import-players-form";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Players</h1>
        <p className="text-gray-500 mt-1">
          Bulk import players from a CSV file
        </p>
      </div>
      <ImportPlayersForm />
    </div>
  );
}
