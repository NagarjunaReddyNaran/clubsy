"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";

interface SlotAvailability {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  available: number;
  alreadyBooked: boolean;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingPanel() {
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchSlots = useCallback(async (d: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/slots?date=${d}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load slots");
        setSlots([]);
      } else {
        setSlots(data);
      }
    } catch {
      setError("Could not load slots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(date);
  }, [date, fetchSlots]);

  async function handleBook(slotId: string) {
    setBookingId(slotId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
      } else {
        setSuccess("Slot booked successfully!");
        fetchSlots(date);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBookingId(null);
    }
  }

  const isPast = date < todayISO();

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-500">Select date</label>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Slots */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No slots available for this date.</p>
            <p className="text-sm text-gray-400 mt-1">
              Contact your club admin to configure time slots.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const isFull = slot.available <= 0;
            const isBooked = slot.alreadyBooked;
            const fillPct = Math.min(100, (slot.bookedCount / slot.capacity) * 100);

            return (
              <Card key={slot.id}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {slot.name && (
                        <p className="font-semibold text-gray-900">{slot.name}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-mono text-gray-700">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>

                      {/* Capacity bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {slot.bookedCount} / {slot.capacity} booked
                          </span>
                          <span className={isFull ? "text-red-500 font-medium" : "text-green-600"}>
                            {isFull ? "Full" : `${slot.available} left`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fillPct >= 100
                                ? "bg-red-500"
                                : fillPct >= 75
                                ? "bg-yellow-400"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {isBooked ? (
                        <Badge variant="success" className="whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Booked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isFull || isPast || bookingId === slot.id}
                          loading={bookingId === slot.id}
                          onClick={() => handleBook(slot.id)}
                        >
                          {isFull ? "Full" : "Book"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
