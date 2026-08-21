import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { attachSessionCookie, createSessionToken } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    // Constant response shape whether the email doesn't exist or the
    // password is wrong, so login never leaks which case occurred.
    const passwordMatches = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      return jsonError("Invalid email or password", 401);
    }

    const { token, maxAge } = await createSessionToken({ id: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, flatNumber: user.flatNumber },
    });
    return attachSessionCookie(response, token, maxAge);
  } catch (error) {
    return handleApiError(error);
  }
}
