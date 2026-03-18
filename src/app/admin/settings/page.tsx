import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClubSettingsForm } from "@/components/admin/club-settings-form";
import { InviteLinkCard } from "@/components/admin/invite-link-card";

export default async function ClubSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const club = await prisma.club.findUnique({
    where: { adminId: session.user.id },
    select: { id: true, name: true, logoUrl: true, inviteCode: true },
  });

  if (!club) redirect("/onboarding");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Club Settings</h1>
        <p className="text-gray-500 mt-1">Manage your club name and invite link</p>
      </div>

      <ClubSettingsForm initialName={club.name} initialLogoUrl={club.logoUrl} />
      <InviteLinkCard inviteCode={club.inviteCode} clubId={club.id} />
    </div>
  );
}
