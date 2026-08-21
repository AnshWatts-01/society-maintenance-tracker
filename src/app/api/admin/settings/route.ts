import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { updateSettingSchema } from "@/lib/validation/schemas";
import { getOverdueThresholdDays, setOverdueThresholdDays } from "@/lib/services/overdueService";
import { handleApiError } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    await requireAdmin();
    const overdueThresholdDays = await getOverdueThresholdDays();
    return NextResponse.json({ overdueThresholdDays });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = updateSettingSchema.parse(await request.json());
    await setOverdueThresholdDays(body.overdueThresholdDays);
    return NextResponse.json({ overdueThresholdDays: body.overdueThresholdDays });
  } catch (error) {
    return handleApiError(error);
  }
}
