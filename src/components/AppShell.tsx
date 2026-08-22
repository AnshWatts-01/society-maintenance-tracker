"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export interface NavItem {
  href: string;
  label: string;
}

/** The lozenge crest — the app's mark, echoed in timeline markers and pins. */
function Crest() {
  return (
    <span className="relative inline-flex h-9 w-9 shrink-0 rotate-45 items-center justify-center rounded-[6px] border border-gold-500/70 bg-ink-soft">
      <span className="-rotate-45 font-display text-sm tracking-wider text-gold-400">S</span>
    </span>
  );
}

function PanelNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`group relative rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-white/[0.07] text-paper"
                : "text-paper/60 hover:bg-white/[0.04] hover:text-paper/90"
            }`}
          >
            {/* Gold active indicator — slides in via width transition */}
            <span
              className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-500 transition-all duration-200 ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut() {
  const router = useRouter();
  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg border border-white/10 px-3.5 py-2.5 text-sm font-medium text-paper/70 transition-colors hover:border-gold-500/50 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
    >
      Sign out
    </button>
  );
}

export function AppShell({
  navItems,
  identityPrimary,
  identitySecondary,
  wide = false,
  children,
}: {
  navItems: NavItem[];
  identityPrimary: string;
  identitySecondary: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on any route change and lock scroll while it is open.
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const panelContents = (onNavigate?: () => void) => (
    <>
      <div className="mb-9 flex items-center gap-3 px-1">
        <Crest />
        <div>
          <p className="font-display text-base leading-tight tracking-wide text-paper">Society Tracker</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-gold-400/90">Estate Register</p>
        </div>
      </div>
      <PanelNav items={navItems} onNavigate={onNavigate} />
      <div className="mt-auto space-y-4 pt-6">
        <div className="border-t border-white/10 pt-4">
          <p className="truncate text-sm font-medium text-paper/90">{identityPrimary}</p>
          <p className="mt-0.5 truncate text-xs text-paper/50">{identitySecondary}</p>
        </div>
        <SignOut />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop ink panel */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink p-5 md:flex">
        {panelContents()}
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-parch bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <Crest />
          <p className="font-display text-base tracking-wide text-ink">Society Tracker</p>
        </div>
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg border border-parch bg-white p-2 text-ink transition-colors hover:border-gold-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="modal-overlay absolute inset-0 bg-ink/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="drawer-panel absolute inset-y-0 left-0 flex w-72 flex-col bg-ink p-5">
            {panelContents(() => setDrawerOpen(false))}
          </div>
        </div>
      )}

      <div className="flex-1 md:pl-64">
        <main className={`page-enter mx-auto px-4 pb-12 pt-20 sm:px-6 md:pt-10 lg:px-10 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
