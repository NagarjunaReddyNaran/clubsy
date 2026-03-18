import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExtensionRequestForm } from "@/components/dashboard/extension-request-form";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ExtendPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: { plan: { select: { name: true } } },
  });

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Request Extension</h1>
        <p className="text-gray-500 mt-1">
          Request additional days for your membership
        </p>
      </div>

      {activeMembership ? (
        <ExtensionRequestForm membershipId={activeMembership.id} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              You need an active membership to request an extension.
            </p>
            <Link href="/dashboard/plans">
              <Button>Browse Plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
