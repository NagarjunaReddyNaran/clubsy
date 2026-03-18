import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ExtensionActions } from "@/components/admin/extension-actions";
import { ClipboardList } from "lucide-react";

export default async function AdminExtensionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const requests = await prisma.extensionRequest.findMany({
    include: {
      user: { select: { name: true, email: true } },
      membership: {
        include: { plan: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Extension Requests</h1>
        <p className="text-gray-500 mt-1">
          {pending.length} pending, {reviewed.length} reviewed
        </p>
      </div>

      {/* Pending */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">
            Pending Requests ({pending.length})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pending requests</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pending.map((req) => (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {req.user.name}
                        </p>
                        <Badge variant="warning">PENDING</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {req.user.email} • {req.membership.plan.name}
                      </p>
                      <p className="text-sm text-gray-700">
                        Requesting <strong>{req.days} day</strong> extension
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                          &ldquo;{req.reason}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Requested on {formatDate(req.createdAt)}
                      </p>
                    </div>
                    <ExtensionActions requestId={req.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">
              Reviewed Requests ({reviewed.length})
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {reviewed.map((req) => (
                <div key={req.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.user.name}</p>
                    <p className="text-xs text-gray-500">
                      {req.days} days • {req.membership.plan.name} •{" "}
                      {formatDate(req.createdAt)}
                    </p>
                    {req.reviewNote && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">
                        Note: {req.reviewNote}
                      </p>
                    )}
                  </div>
                  <Badge variant={req.status === "APPROVED" ? "success" : "danger"}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
