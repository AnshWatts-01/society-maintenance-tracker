"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { CurrentUser } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", flatNumber: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { user } = await apiFetch<{ user: CurrentUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push(user.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Create your resident account</h1>
          <p className="mt-1 text-sm text-slate-500">Raise and track maintenance complaints for your flat</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="flatNumber">Flat number</label>
              <input id="flatNumber" required className="input" placeholder="A-204" value={form.flatNumber} onChange={(e) => update("flatNumber", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone (optional)</label>
              <input id="phone" className="input" placeholder="+91XXXXXXXXXX" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters</p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
