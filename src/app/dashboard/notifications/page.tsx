import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";
import { Bell } from "lucide-react";
import { MarkReadButton } from "@/components/dashboard/mark-read-button";
import { MarkOneReadButton } from "@/components/dashboard/mark-one-read-button";

const PAGE_SIZE = 10;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));

  const [notifications, total, unreadTotal] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {unreadTotal > 0 ? (
              <span className="text-blue-600 font-medium">{unreadTotal} unread</span>
            ) : (
              "All caught up!"
            )}
            {total > 0 && <span className="text-gray-400"> · {total} total</span>}
          </p>
        </div>
        {unreadTotal > 0 && <MarkReadButton userId={session.user.id} />}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">Club announcements will appear here.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-5 py-4 transition-colors ${
                      !notif.isRead ? "bg-blue-50/40" : "hover:bg-gray-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            notif.isRead ? "bg-gray-200" : "bg-blue-500"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm font-medium ${notif.isRead ? "text-gray-700" : "text-gray-900"}`}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-xs text-gray-400 whitespace-nowrap"
                              title={formatDate(notif.createdAt)}
                            >
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                            {!notif.isRead && (
                              <MarkOneReadButton notificationId={notif.id} />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Suspense fallback={null}>
                <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />
              </Suspense>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
