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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="page-enter w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="relative inline-flex h-11 w-11 rotate-45 items-center justify-center rounded-[7px] border border-gold-500 bg-ink">
            <span className="-rotate-45 font-display text-lg tracking-wider text-gold-400">S</span>
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Society Tracker</h1>
          <p className="eyebrow mt-1.5">Estate Register</p>
          <p className="mt-3 text-sm text-ink-mute">Sign in to raise or track complaints.</p>
        </div>

        <form onSubmit={handleSubmit} className="card relative p-7 sm:p-8">
          <span className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-gold-600 via-gold-300 to-transparent" />
          <div className="space-y-4">
            {error && <p className="alert-error">{error}</p>}

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
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-ink-mute">
          New resident?{" "}
          <a href="/register" className="link-quiet">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
