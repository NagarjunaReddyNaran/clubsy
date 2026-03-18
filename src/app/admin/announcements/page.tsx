import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";
import { Plus, Megaphone, Pencil } from "lucide-react";
import { AnnouncementActions } from "@/components/admin/announcement-actions";

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const clubId = session.user.clubId;
  const announcements = await prisma.announcement.findMany({
    where: clubId ? { clubId } : {},
    orderBy: { createdAt: "desc" },
  });

  const activeCount = announcements.filter((a) => a.isActive).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {activeCount} active · {announcements.length} total
          </p>
        </div>
        <Link href="/admin/announcements/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No announcements yet</p>
              <p className="text-sm text-gray-400 mt-1">Post announcements to notify all club members.</p>
              <Link href="/admin/announcements/new">
                <Button size="sm" className="mt-4"><Plus className="w-4 h-4" /> Create first announcement</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {announcements.map((ann) => (
                <div key={ann.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-gray-900">{ann.title}</h3>
                        <Badge variant={ann.isActive ? "success" : "default"}>
                          {ann.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ann.content}</p>
                      <p
                        className="text-xs text-gray-400"
                        title={formatDate(ann.createdAt)}
                      >
                        {formatRelativeTime(ann.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link
                        href={`/admin/announcements/${ann.id}/edit`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit announcement"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <AnnouncementActions id={ann.id} isActive={ann.isActive} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
