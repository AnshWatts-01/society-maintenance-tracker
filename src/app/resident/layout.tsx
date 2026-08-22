import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/AppShell";

const NAV_ITEMS = [
  { href: "/resident/dashboard", label: "My Complaints" },
  { href: "/resident/complaints/new", label: "Raise a Complaint" },
  { href: "/resident/notices", label: "Notice Board" },
];

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const profile = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, flatNumber: true },
  });

  return (
    <AppShell
      navItems={NAV_ITEMS}
      identityPrimary={profile?.name ?? "Resident"}
      identitySecondary={profile?.flatNumber ? `Flat ${profile.flatNumber}` : session.email}
    >
      {children}
    </AppShell>
  );
}
