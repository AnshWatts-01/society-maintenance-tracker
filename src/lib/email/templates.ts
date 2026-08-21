import { escapeHtml } from "@/lib/utils/sanitize";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/utils/constants";
import type { ComplaintCategory, ComplaintStatus } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1f63e0;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Society Maintenance Tracker</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1a1a1a;">
                <h2 style="margin:0 0 12px;font-size:18px;">${escapeHtml(title)}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f4f6f8;color:#8a8f98;font-size:12px;">
                This is an automated notification. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function statusChangeEmail(params: {
  residentName: string;
  complaintId: string;
  category: ComplaintCategory;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  note?: string | null;
}) {
  const subject = `Your complaint is now ${STATUS_LABELS[params.newStatus]}`;
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(params.residentName)},</p>
    <p style="margin:0 0 12px;">
      Your <strong>${escapeHtml(CATEGORY_LABELS[params.category])}</strong> complaint
      ${params.previousStatus ? `moved from <strong>${escapeHtml(STATUS_LABELS[params.previousStatus])}</strong> to` : "is now"}
      <strong>${escapeHtml(STATUS_LABELS[params.newStatus])}</strong>.
    </p>
    ${params.note ? `<p style="margin:0 0 12px;background:#f4f6f8;border-radius:8px;padding:12px;"><em>Admin note:</em> ${escapeHtml(params.note)}</p>` : ""}
    <p style="margin:16px 0 0;">
      <a href="${APP_URL}/resident/complaints/${params.complaintId}" style="color:#1f63e0;">View full status history &rarr;</a>
    </p>
  `;
  return { subject, html: layout(subject, body) };
}

export function importantNoticeEmail(params: { residentName: string; title: string; body: string }) {
  const subject = `📌 Important notice: ${params.title}`;
  const html = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(params.residentName)},</p>
    <p style="margin:0 0 12px;">A new important notice has been posted:</p>
    <div style="border-left:3px solid #1f63e0;padding:8px 16px;background:#f4f6f8;border-radius:0 8px 8px 0;">
      <strong>${escapeHtml(params.title)}</strong>
      <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(params.body)}</p>
    </div>
    <p style="margin:16px 0 0;">
      <a href="${APP_URL}/resident/notices" style="color:#1f63e0;">View the notice board &rarr;</a>
    </p>
  `;
  return { subject, html: layout(subject, html) };
}
