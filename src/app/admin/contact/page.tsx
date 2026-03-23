import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactMarkRead } from "@/components/admin/contact-mark-read";
import { MessageSquare, Inbox } from "lucide-react";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General",
  support: "Support",
  billing: "Billing",
};

const SUBJECT_VARIANTS: Record<string, "default" | "info" | "warning"> = {
  general: "default",
  support: "info",
  billing: "warning",
};

export default async function AdminContactPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const submissions = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = submissions.filter((s) => !s.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Submissions</h1>
        <p className="text-gray-500 mt-1">
          {submissions.length} total{unreadCount > 0 && ` · ${unreadCount} unread`}
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No contact submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <Card key={s.id} className={s.isRead ? "opacity-70" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        {!s.isRead && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                        )}
                        <Badge variant={SUBJECT_VARIANTS[s.subject] ?? "default"}>
                          {SUBJECT_LABELS[s.subject] ?? s.subject}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {!s.isRead && <ContactMarkRead id={s.id} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
