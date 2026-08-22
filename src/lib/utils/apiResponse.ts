import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/session";
import { InvalidTransitionError, ConcurrentModificationError } from "@/lib/services/complaintService";
import { PhotoValidationError } from "@/lib/services/photoService";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Central error-to-HTTP-response mapping so every route handler stays a thin controller. */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 422, error.flatten());
  }
  if (error instanceof UnauthorizedError) {
    return jsonError(error.message, 401);
  }
  if (error instanceof ForbiddenError) {
    return jsonError(error.message, 403);
  }
  if (error instanceof InvalidTransitionError) {
    return jsonError(error.message, 409);
  }
  if (error instanceof PhotoValidationError) {
    return jsonError(error.message, 422);
  }
  if (error instanceof ConcurrentModificationError) {
    return jsonError(error.message, 409);
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return jsonError("Resource not found", 404);
  }

  console.error("Unhandled API error:", error);
  return jsonError("Internal server error", 500);
}
