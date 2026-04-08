import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { canUseBooking } from "@/lib/features";
import { SlotManager } from "@/components/admin/slot-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";

export default async function AdminSlotsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  // Premium gate
  if (!canUseBooking(session.user.subscriptionPlan)) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slot Booking</h1>
          <p className="text-gray-500 mt-2">
            The slot booking system is a <strong>Premium</strong> feature. Upgrade your plan to
            configure time slots and let players book sessions.
          </p>
        </div>
        <Card>
          <CardContent className="py-6 space-y-4">
            <ul className="text-sm text-left text-gray-600 space-y-2">
              {[
                "Define reusable time slots with capacity limits",
                "Players book specific sessions in advance",
                "Prevent overbooking automatically",
                "View and manage all bookings from one place",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/admin/billing">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Zap className="w-4 h-4" />
                Upgrade to Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clubId = session.user.clubId!;

  const slots = await prisma.slot.findMany({
    where: { clubId },
    include: {
      _count: {
        select: {
          bookings: { where: { status: "CONFIRMED", date: { gte: new Date() } } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Slot Configuration</h1>
        <p className="text-gray-500 mt-1">
          Define reusable time slots that players can book.
        </p>
      </div>
      <SlotManager initialSlots={slots} />
    </div>
  );
}
