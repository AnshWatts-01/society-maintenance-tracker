import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await readSessionFromCookies();

  if (!session) redirect("/login");
  redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard");
}
