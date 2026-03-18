"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function PlayerDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This will also remove all their memberships and payment records.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete player");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      title="Delete player"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
