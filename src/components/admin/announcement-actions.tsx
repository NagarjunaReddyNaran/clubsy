"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface AnnouncementActionsProps {
  id: string;
  isActive: boolean;
}

export function AnnouncementActions({ id, isActive }: AnnouncementActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this announcement?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        loading={loading}
        onClick={toggle}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={loading}
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}
