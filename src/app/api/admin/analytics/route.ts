import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getDashboardAnalytics } from "@/lib/services/analyticsService";
import { handleApiError } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    await requireAdmin();
    const analytics = await getDashboardAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
