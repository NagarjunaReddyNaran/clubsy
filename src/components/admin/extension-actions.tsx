"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ExtensionActionsProps {
  requestId: string;
}

export function ExtensionActions({ requestId }: ExtensionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);

    try {
      const res = await fetch(`/api/admin/extensions/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote }),
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {showNote && (
        <input
          type="text"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Review note (optional)"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNote(!showNote)}
        >
          Note
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={loading === "reject"}
          disabled={!!loading}
          onClick={() => handleAction("reject")}
        >
          <X className="w-3 h-3" />
          Reject
        </Button>
        <Button
          size="sm"
          loading={loading === "approve"}
          disabled={!!loading}
          onClick={() => handleAction("approve")}
        >
          <Check className="w-3 h-3" />
          Approve
        </Button>
      </div>
    </div>
  );
}
