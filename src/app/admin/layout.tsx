import { requireAdmin } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/notices", label: "Notice Board" },
  { href: "/admin/settings", label: "SLA Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <AppShell
      navItems={NAV_ITEMS}
      identityPrimary="Society Admin"
      identitySecondary={admin.email}
      wide
    >
      {children}
    </AppShell>
  );
}
