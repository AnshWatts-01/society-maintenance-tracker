import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { signSessionJwt, verifySessionJwt, type SessionJwtPayload } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function getSessionTtlSeconds(): number {
  const raw = process.env.AUTH_SESSION_TTL_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24 * 7;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "RESIDENT" | "ADMIN";
}

export async function createSessionToken(user: AuthUser): Promise<{ token: string; maxAge: number }> {
  const maxAge = getSessionTtlSeconds();
  const token = await signSessionJwt(
    { sub: user.id, role: user.role, email: user.email },
    getAuthSecret(),
    maxAge
  );
  return { token, maxAge };
}

export function attachSessionCookie(response: NextResponse, token: string, maxAge: number): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function readSessionFromCookies(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSessionToken(token);
}

export async function decodeSessionToken(token: string): Promise<AuthUser | null> {
  const payload: SessionJwtPayload | null = await verifySessionJwt(token, getAuthSecret());
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await readSessionFromCookies();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}
