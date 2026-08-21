import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { createNoticeSchema } from "@/lib/validation/schemas";
import { createNotice, listNotices } from "@/lib/services/noticeService";
import { sanitizePlainText } from "@/lib/utils/sanitize";
import { handleApiError } from "@/lib/utils/apiResponse";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { page, pageSize } = listQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const result = await listNotices(page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = createNoticeSchema.parse(await request.json());

    const notice = await createNotice({
      authorId: admin.id,
      title: sanitizePlainText(body.title),
      body: sanitizePlainText(body.body),
      isImportant: body.isImportant,
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
