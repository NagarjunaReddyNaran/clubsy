"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

const PERKS = [
  "14-day free trial, no credit card required",
  "Manage memberships, plans & payments",
  "Invite players via a shareable link",
  "CSV import & export",
];

export default function StartPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
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
        setError("Account created but sign-in failed. Please log in.");
        router.push("/login");
      } else {
        router.push("/onboarding");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Pitch */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">Clubsy</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Run your sports club<br />like a pro.
          </h1>
          <p className="text-gray-500 text-lg">
            Everything you need to manage memberships, payments, and players — in one place.
          </p>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6 md:hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Clubsy</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your admin account</h2>
          <p className="text-gray-500 text-sm mb-5">Start your 14-day free trial. No card needed.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="name" name="name" label="Full name" value={formData.name} onChange={handleChange} placeholder="Jane Smith" required />
            <Input id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} placeholder="you@yourclub.com" required />
            <Input id="phone" name="phone" label="Phone (optional)" type="tel" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
            <Input id="password" name="password" label="Password" type="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" required />
            <Input id="confirmPassword" name="confirmPassword" label="Confirm password" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Start free trial
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
