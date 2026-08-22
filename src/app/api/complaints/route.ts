import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createComplaintSchema, listComplaintsQuerySchema } from "@/lib/validation/schemas";
import { createComplaint } from "@/lib/services/complaintService";
import { listComplaintsForAdmin, listComplaintsForResident } from "@/lib/services/complaintQueryService";
import { isOwnedObjectPath, isStorageConfigured, publicObjectUrl } from "@/lib/storage/supabaseStorage";
import { sanitizePlainText } from "@/lib/utils/sanitize";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const query = listComplaintsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const result =
      user.role === "ADMIN"
        ? await listComplaintsForAdmin(query)
        : await listComplaintsForResident(user.id, query);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createComplaintSchema.parse(await request.json());

    // A photo reference is only honoured if it names an object this resident
    // actually had a signed URL minted for; the display URL is then built
    // from our own template rather than taken from the request.
    if (body.photoPath && body.photoId) {
      return jsonError("Provide either photoPath or photoId, not both", 422);
    }
    if (body.photoPath) {
      if (!isStorageConfigured()) {
        return jsonError("Photo uploads are not enabled on this deployment", 503);
      }
      if (!isOwnedObjectPath(user.id, body.photoPath)) {
        return jsonError("Invalid photo reference", 422);
      }
    }
    // photoId (first-party storage) ownership + single-use are enforced
    // atomically inside createComplaint's transaction.
    const photoUrl = body.photoPath
      ? publicObjectUrl(body.photoPath)
      : body.photoId
        ? `/api/photos/${body.photoId}`
        : undefined;

    const complaint = await createComplaint({
      residentId: user.id,
      category: body.category,
      description: sanitizePlainText(body.description),
      photoUrl,
      photoPath: body.photoPath,
      photoId: body.photoId,
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
