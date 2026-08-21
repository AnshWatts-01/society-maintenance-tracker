import { requireAdmin } from "@/lib/auth/session";
import { NavLinks } from "@/components/NavLinks";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/notices", label: "Notice Board" },
  { href: "/admin/settings", label: "SLA Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <div className="mb-8">
          <p className="text-lg font-semibold text-slate-900">Society Tracker</p>
          <p className="mt-1 text-xs text-slate-500">Admin · {admin.email}</p>
        </div>
        <NavLinks items={NAV_ITEMS} />
        <div className="mt-auto pt-6">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:hidden">
          <p className="text-lg font-semibold">Society Tracker</p>
          <LogoutButton />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
