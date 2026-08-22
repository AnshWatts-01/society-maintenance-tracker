import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { storePhoto, PhotoValidationError } from "@/lib/services/photoService";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/utils/constants";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

/**
 * First-party photo upload (the zero-configuration storage backend).
 * Accepts multipart/form-data with a single `file` field; the bytes are
 * validated by magic-byte sniffing and stored in Postgres, then served
 * auth-gated by GET /api/photos/[id].
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_PHOTO_SIZE_BYTES + 16 * 1024) {
      return jsonError(`Photo must be smaller than ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB`, 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Send the image as a multipart `file` field", 422);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const photo = await storePhoto(user.id, bytes);

    return NextResponse.json(
      { photoId: photo.id, url: `/api/photos/${photo.id}`, sizeBytes: photo.sizeBytes },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PhotoValidationError) {
      return jsonError(error.message, 422);
    }
    return handleApiError(error);
  }
}
