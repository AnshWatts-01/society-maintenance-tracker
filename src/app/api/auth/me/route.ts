import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readSessionFromCookies } from "@/lib/auth/session";
import { handleApiError } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const session = await readSessionFromCookies();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, flatNumber: true, phone: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
