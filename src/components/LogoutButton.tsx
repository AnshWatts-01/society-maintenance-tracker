"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="btn-secondary w-full">
      Sign out
    </button>
  );
}
