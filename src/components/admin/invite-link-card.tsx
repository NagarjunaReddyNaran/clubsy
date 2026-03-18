"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Copy, RefreshCw, CheckCircle2 } from "lucide-react";

interface InviteLinkCardProps {
  inviteCode: string;
  clubId: string;
}

export function InviteLinkCard({ inviteCode: initialCode }: InviteLinkCardProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`;

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    if (!confirm("Regenerate invite code? The old link will stop working.")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/admin/club/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteCode(data.inviteCode);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Player Invite Link</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-500">
          Share this link with players to let them join your club.
        </p>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <code className="text-sm text-blue-700 flex-1 truncate font-mono">{inviteUrl}</code>
        </div>

        <div className="flex gap-2">
          <Button onClick={copyLink} variant="outline" size="sm" className="flex-1">
            {copied ? (
              <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copied!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copy link</>
            )}
          </Button>
          <Button onClick={regenerate} variant="ghost" size="sm" loading={regenerating}>
            <RefreshCw className="w-4 h-4" />
            New code
          </Button>
        </div>

        <div className="text-xs text-gray-400 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
          Invite code: <span className="font-mono font-semibold text-yellow-700 tracking-widest">{inviteCode}</span> — players can also type this code manually.
        </div>
      </CardContent>
    </Card>
  );
}
