import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { updateStatusSchema } from "@/lib/validation/schemas";
import { transitionComplaintStatus } from "@/lib/services/complaintService";
import { sanitizePlainText } from "@/lib/utils/sanitize";
import { handleApiError } from "@/lib/utils/apiResponse";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = updateStatusSchema.parse(await request.json());

    const complaint = await transitionComplaintStatus({
      complaintId: id,
      actorId: admin.id,
      newStatus: body.status,
      note: body.note ? sanitizePlainText(body.note) : undefined,
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    return handleApiError(error);
  }
}
