import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { CreditCard, FileText } from "lucide-react";

const statusColor: Record<string, "success" | "warning" | "danger" | "default"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "default",
};

export default async function MyPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    include: {
      membership: {
        select: {
          plan: { select: { name: true } },
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPaid = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-500 mt-1">{payments.length} transaction{payments.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Summary card */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Paid</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalPaid, (payments[0]?.currency as never) || "CAD")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments list */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payment records yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{p.membership.plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(p.membership.startDate)} – {formatDate(p.membership.endDate)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {p.paymentSource === "ONLINE" ? "Online payment" : "In-person payment"}
                      {p.method && p.method !== "pending" ? ` · ${p.method}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-bold text-gray-900">
                      {formatCurrency(p.amount, (p.currency as never) || "CAD")}
                    </p>
                    <Badge variant={statusColor[p.status] || "default"}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                  {p.invoiceUrl && (
                    <a
                      href={p.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      View Invoice
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
