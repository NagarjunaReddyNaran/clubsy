"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

export function NoClubScreen() {
  const router = useRouter();
  const { update } = useSession();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate the invite code exists
      const res = await fetch(`/api/join/${inviteCode.trim().toUpperCase()}`);
      if (!res.ok) {
        setError("Invalid invite code. Check with your club admin.");
        return;
      }

      // Update the user's clubId
      const patchRes = await fetch("/api/user/join-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });

      if (!patchRes.ok) {
        const data = await patchRes.json();
        setError(data.error || "Failed to join club");
        return;
      }

      await update();
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl">
          <Users className="w-8 h-8 text-blue-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Join a Club</h2>
          <p className="text-gray-500 mt-2 text-sm">
            You&apos;re not part of any club yet. Enter the invite code your club admin shared with you.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-left">
              {error}
            </div>
          )}
          <Input
            id="inviteCode"
            label="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC12345"
            className="text-center font-mono tracking-widest text-lg"
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            Join Club
          </Button>
        </form>
      </div>
    </div>
  );
}
