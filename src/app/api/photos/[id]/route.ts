import { requireUser } from "@/lib/auth/session";
import { getPhotoForViewer } from "@/lib/services/photoService";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

/** Serves a stored complaint photo to its uploader or any admin. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const photo = await getPhotoForViewer(id, user);
    if (!photo) return jsonError("Photo not found", 404);

    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(photo.sizeBytes),
        // Private: the image is auth-gated, so shared caches must not keep it.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
