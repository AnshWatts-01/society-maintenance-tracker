/**
 * Thin wrapper around Resend's HTTP API using the platform `fetch`, so no
 * SDK (`resend`, `nodemailer`, `@sendgrid/mail`, ...) needs to be added as a
 * dependency for what is, at its core, a single POST request.
 */
export async function sendViaResend(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY or EMAIL_FROM is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API responded ${response.status}: ${body}`);
  }
}
