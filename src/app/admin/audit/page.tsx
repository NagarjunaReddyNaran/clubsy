import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import type { AuditAction } from "@prisma/client";

const actionColor: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
  MEMBERSHIP_CREATED: "success",
  MEMBERSHIP_CANCELLED: "danger",
  MEMBERSHIP_EXTENDED: "success",
  PAYMENT_RECORDED: "success",
  PLAN_CREATED: "info",
  PLAN_UPDATED: "info",
  USER_REGISTERED: "info",
  EXTENSION_APPROVED: "success",
  EXTENSION_REJECTED: "danger",
  DATA_EXPORTED: "default",
  DATA_IMPORTED: "warning",
  ANNOUNCEMENT_CREATED: "info",
};

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Membership", value: "MEMBERSHIP" },
  { label: "Payment", value: "PAYMENT" },
  { label: "Plan", value: "PLAN" },
  { label: "Extension", value: "EXTENSION" },
  { label: "User", value: "USER" },
  { label: "Data", value: "DATA" },
  { label: "Announcement", value: "ANNOUNCEMENT" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const TAB_VALUES = new Set<string>(TABS.map((t) => t.value));

const TAB_ACTIONS: Record<string, AuditAction[]> = {
  MEMBERSHIP: ["MEMBERSHIP_CREATED", "MEMBERSHIP_CANCELLED", "MEMBERSHIP_EXTENDED"],
  PAYMENT: ["PAYMENT_RECORDED"],
  PLAN: ["PLAN_CREATED", "PLAN_UPDATED"],
  EXTENSION: ["EXTENSION_APPROVED", "EXTENSION_REJECTED"],
  USER: ["USER_REGISTERED"],
  DATA: ["DATA_EXPORTED", "DATA_IMPORTED"],
  ANNOUNCEMENT: ["ANNOUNCEMENT_CREATED"],
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { category } = await searchParams;
  const activeTab: TabValue =
    category && TAB_VALUES.has(category) && category !== "ALL"
      ? (category as TabValue)
      : "ALL";

  const logs = await prisma.auditLog.findMany({
    where:
      activeTab !== "ALL" && TAB_ACTIONS[activeTab]
        ? { action: { in: TAB_ACTIONS[activeTab] } }
        : undefined,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">Track of all key actions in the system</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ label, value }) => {
          const isActive = value === "ALL" ? activeTab === "ALL" : activeTab === value;
          return (
            <Link
              key={value}
              href={value === "ALL" ? "/admin/audit" : `/admin/audit?category=${value}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">
            {activeTab === "ALL" ? "Recent Actions" : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Actions`} ({logs.length})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="px-4 sm:px-6 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={actionColor[log.action] || "default"} className="text-xs flex-shrink-0">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.user && (
                        <span className="text-xs text-gray-600 truncate">
                          by {log.user.name}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{log.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
