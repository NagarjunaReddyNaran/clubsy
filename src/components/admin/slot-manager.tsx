"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Pencil, Trash2, Users, X, Check } from "lucide-react";

interface Slot {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  _count: { bookings: number };
}

interface SlotManagerProps {
  initialSlots: Slot[];
}

const EMPTY_FORM = {
  name: "",
  startTime: "09:00",
  endTime: "10:00",
  capacity: "8",
  isActive: true,
};

export function SlotManager({ initialSlots }: SlotManagerProps) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(slot: Slot) {
    setEditingId(slot.id);
    setForm({
      name: slot.name ?? "",
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: String(slot.capacity),
      isActive: slot.isActive,
    });
    setError("");
    setShowForm(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      name: form.name.trim() || null,
      startTime: form.startTime,
      endTime: form.endTime,
      capacity: parseInt(form.capacity),
      isActive: form.isActive,
    };

    try {
      const url = editingId ? `/api/admin/slots/${editingId}` : "/api/admin/slots";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save slot");
        return;
      }

      if (editingId) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === editingId ? { ...s, ...data } : s
          )
        );
      } else {
        setSlots((prev) => [...prev, { ...data, _count: { bookings: 0 } }]);
      }

      setShowForm(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/slots/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete slot");
      } else {
        setSlots((prev) => prev.filter((s) => s.id !== id));
        setDeleteConfirm(null);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(slot: Slot) {
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slot.isActive }),
      });
      if (res.ok) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, isActive: !s.isActive } : s))
        );
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      {/* Global error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Edit Slot" : "New Slot"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="name"
                label="Slot name (optional)"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Morning Session"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Start time</label>
                  <input
                    name="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">End time</label>
                  <input
                    name="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Input
                name="capacity"
                label="Max players per slot"
                type="number"
                min="1"
                max="500"
                value={form.capacity}
                onChange={handleChange}
                required
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active (players can book this slot)</span>
              </label>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={loading}>
                  {editingId ? "Save Changes" : "Create Slot"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Slot list + Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} configured
        </p>
        {!showForm && (
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4" />
            Add Slot
          </Button>
        )}
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No slots configured yet</p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Create First Slot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {slots.map((slot) => (
            <Card key={slot.id} className={slot.isActive ? "" : "opacity-60"}>
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    {slot.name && (
                      <p className="font-medium text-gray-900 truncate">{slot.name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-mono text-gray-700">
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>
                  </div>
                  <Badge variant={slot.isActive ? "success" : "default"} className="ml-2 flex-shrink-0">
                    {slot.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>Capacity: {slot.capacity}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span>{slot._count.bookings} upcoming</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => toggleActive(slot)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title={slot.isActive ? "Deactivate" : "Activate"}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {slot.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openEdit(slot)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {deleteConfirm === slot.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(slot.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
