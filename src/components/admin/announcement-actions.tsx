"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

interface AnnouncementActionsProps {
  id: string;
  title: string;
  isActive: boolean;
}

export function AnnouncementActions({ id, title, isActive }: AnnouncementActionsProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggle() {
    setToggling(true);
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" loading={toggling} onClick={toggle}>
          {isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={toggling}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete announcement?"
        description={`"${title}" will be permanently deleted and members will no longer see it. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
