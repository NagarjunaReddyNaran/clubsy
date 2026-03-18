import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export default async function NewAnnouncementPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Announcement</h1>
        <p className="text-gray-500 mt-1">Send a message to all players</p>
      </div>
      <AnnouncementForm />
    </div>
  );
}
