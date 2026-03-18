"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MembershipStatusActionsProps {
  membershipId: string;
  currentStatus: string;
}

export function MembershipStatusActions({
  membershipId,
  currentStatus,
}: MembershipStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 pt-2">
      {currentStatus !== "ACTIVE" && (
        <Button
          size="sm"
          loading={loading}
          onClick={() => updateStatus("ACTIVE")}
        >
          Activate
        </Button>
      )}
      {currentStatus === "ACTIVE" && (
        <Button
          variant="danger"
          size="sm"
          loading={loading}
          onClick={() => updateStatus("CANCELLED")}
        >
          Cancel Membership
        </Button>
      )}
      {currentStatus !== "EXPIRED" && currentStatus !== "ACTIVE" && (
        <Button
          variant="outline"
          size="sm"
          loading={loading}
          onClick={() => updateStatus("EXPIRED")}
        >
          Mark Expired
        </Button>
      )}
    </div>
  );
}
