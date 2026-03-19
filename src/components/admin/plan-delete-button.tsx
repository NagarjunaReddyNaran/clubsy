"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PlanDeleteButtonProps {
  planId: string;
  planName: string;
  activeMembershipCount: number;
}

export function PlanDeleteButton({ planId, planName, activeMembershipCount }: PlanDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasActiveMemberships = activeMembershipCount > 0;

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-3 h-3" />
        {hasActiveMemberships ? "Deactivate" : "Delete"}
      </Button>

      <ConfirmDialog
        open={open}
        title={hasActiveMemberships ? `Deactivate "${planName}"?` : `Delete "${planName}"?`}
        description={
          hasActiveMemberships
            ? `This plan has ${activeMembershipCount} active membership${activeMembershipCount === 1 ? "" : "s"}. It will be deactivated and hidden from players, but existing memberships will not be affected.`
            : "This plan has no memberships and will be permanently deleted. This cannot be undone."
        }
        confirmLabel={hasActiveMemberships ? "Deactivate" : "Delete"}
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
