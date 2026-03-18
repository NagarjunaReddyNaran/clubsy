"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, AlertCircle } from "lucide-react";

interface ClubInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  _count: { members: number };
}

export default function JoinClubPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router = useRouter();

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingClub, setLoadingClub] = useState(true);

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/join/${inviteCode}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setClub(data); })
      .finally(() => setLoadingClub(false));
  }, [inviteCode]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          inviteCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingClub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Invalid invite link</h1>
          <p className="text-gray-500 text-sm">This invite link is invalid or has expired.</p>
          <Link href="/login">
            <Button variant="outline">Go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Club banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              You&apos;re invited to join
            </h1>
            <div className="px-4 py-2 bg-blue-50 rounded-xl">
              <p className="text-lg font-semibold text-blue-700">{club?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {club?._count.members} member{club?._count.members !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="name" name="name" label="Full name" value={formData.name} onChange={handleChange} placeholder="Jane Smith" required />
            <Input id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
            <Input id="phone" name="phone" label="Phone (optional)" type="tel" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
            <Input id="password" name="password" label="Password" type="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" required />
            <Input id="confirmPassword" name="confirmPassword" label="Confirm password" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Join {club?.name}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
