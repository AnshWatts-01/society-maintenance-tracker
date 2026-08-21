import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth/session";
import { getComplaintWithHistory } from "@/lib/services/complaintService";
import { handleApiError, jsonError } from "@/lib/utils/apiResponse";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const complaint = await getComplaintWithHistory(id);

    if (!complaint) return jsonError("Complaint not found", 404);
    if (user.role !== "ADMIN" && complaint.residentId !== user.id) {
      throw new ForbiddenError("You can only view your own complaints");
    }

    return NextResponse.json({ complaint });
  } catch (error) {
    return handleApiError(error);
  }
}
