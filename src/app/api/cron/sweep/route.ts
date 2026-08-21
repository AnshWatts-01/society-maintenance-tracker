import { NextResponse, type NextRequest } from "next/server";
import { resweepOverdueFlags } from "@/lib/services/overdueService";
import { retryFailedNotifications } from "@/lib/email/dispatch";
import { jsonError } from "@/lib/utils/apiResponse";

/**
 * Scheduled half of the hybrid overdue engine + the notification retry
 * boundary. Invoked hourly by Vercel Cron (see vercel.json) and authorized
 * with a bearer secret so it cannot be triggered by arbitrary requests.
 */
export async function GET(request: NextRequest) {
  const provided = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!process.env.CRON_SECRET || provided !== expected) {
    return jsonError("Unauthorized", 401);
  }

  const overdue = await resweepOverdueFlags();
  const notifications = await retryFailedNotifications();

  return NextResponse.json({ overdue, notifications });
}
