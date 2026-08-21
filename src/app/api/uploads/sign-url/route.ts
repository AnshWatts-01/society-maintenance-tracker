import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { signUploadUrlSchema } from "@/lib/validation/schemas";
import { buildObjectPath, createSignedUploadTarget, isStorageConfigured } from "@/lib/storage/supabaseStorage";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/utils/constants";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

/**
 * Authorizes exactly one upload: validates MIME type and size against the
 * server's own policy (never trusting client-reported values after the
 * fact) BEFORE minting a signed, single-object, short-lived upload URL.
 * The actual file bytes never touch this server — see lib/storage.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    // Photos are an optional feature. When storage isn't configured, say so
    // plainly instead of surfacing a generic 500 the resident can't act on.
    if (!isStorageConfigured()) {
      return jsonError("Photo uploads are not enabled on this deployment", 503);
    }

    const body = signUploadUrlSchema.parse(await request.json());

    if (body.fileSizeBytes > MAX_PHOTO_SIZE_BYTES) {
      return jsonError(`Photo must be smaller than ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB`, 422);
    }

    const objectPath = buildObjectPath(user.id, body.fileName);
    const target = await createSignedUploadTarget(objectPath);

    return NextResponse.json(target);
  } catch (error) {
    return handleApiError(error);
  }
}
