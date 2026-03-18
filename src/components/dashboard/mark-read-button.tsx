"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MarkReadButtonProps {
  userId: string;
}

export function MarkReadButton({ userId }: MarkReadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" loading={loading} onClick={markAllRead}>
      Mark all read
    </Button>
  );
}
