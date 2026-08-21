"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { CurrentUser } from "@/types";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { user } = await apiFetch<{ user: CurrentUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const home = user.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard";
      // Honour the deep link middleware captured on the way in, but only if
      // it points at this user's own area — never at an open redirect.
      const next = searchParams.get("next");
      const prefix = user.role === "ADMIN" ? "/admin/" : "/resident/";
      const destination = next && next.startsWith(prefix) ? next : home;

      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Society Maintenance Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to raise or manage complaints</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          New resident?{" "}
          <a href="/register" className="font-medium text-brand-600 hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
