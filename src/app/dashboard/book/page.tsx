import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canUseBooking } from "@/lib/features";
import { BookingPanel } from "@/components/dashboard/booking-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default async function BookSlotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center space-y-4">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Booking Unavailable</h1>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">
              Slot booking is not enabled for your club. Contact your club admin for more
              information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book a Slot</h1>
        <p className="text-gray-500 mt-1">Select a date and pick an available time slot.</p>
      </div>
      <BookingPanel />
    </div>
  );
}
