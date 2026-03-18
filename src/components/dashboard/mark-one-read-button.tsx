"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export function MarkOneReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={markRead}
      disabled={loading}
      title="Mark as read"
      className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
    >
      <Check className="w-3.5 h-3.5" />
    </button>
  );
}
