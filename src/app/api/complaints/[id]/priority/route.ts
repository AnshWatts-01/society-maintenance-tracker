import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { updatePrioritySchema } from "@/lib/validation/schemas";
import { updateComplaintPriority } from "@/lib/services/complaintService";
import { handleApiError } from "@/lib/utils/apiResponse";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = updatePrioritySchema.parse(await request.json());

    const complaint = await updateComplaintPriority({ complaintId: id, priority: body.priority });
    return NextResponse.json({ complaint });
  } catch (error) {
    return handleApiError(error);
  }
}
