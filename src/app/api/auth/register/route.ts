import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { attachSessionCookie, createSessionToken } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/schemas";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

// Public registration always creates a RESIDENT. Admin accounts are
// provisioned out-of-band (seed script / direct DB access) so account
// creation can never be used to self-elevate to ADMIN.
export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        flatNumber: body.flatNumber,
        phone: body.phone || null,
        role: "RESIDENT",
      },
    });

    const { token, maxAge } = await createSessionToken({ id: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, flatNumber: user.flatNumber },
    });
    return attachSessionCookie(response, token, maxAge);
  } catch (error) {
    return handleApiError(error);
  }
}
