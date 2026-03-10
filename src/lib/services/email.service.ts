import { Resend } from "resend";

function createResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function buildHtml(title: string, url: string): string {
  return `<div style="font-family:sans-serif;max-width:600px">
    <h2>Invitatia ta este live!</h2>
    <p><strong>${title}</strong> este acum disponibila la:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Poti distribui acest link invitatilor tai.</p>
  </div>`;
}

/**
 * Sends a publish success email via Resend.
 * Gracefully skips if RESEND_API_KEY is not configured.
 * Does NOT throw — email failure must not block the publish success response.
 */
export async function sendPublishSuccessEmail(
  to: string,
  title: string,
  url: string
): Promise<void> {
  const resend = createResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  const from = process.env.RESEND_FROM_DOMAIN
    ? `Invitatii <no-reply@${process.env.RESEND_FROM_DOMAIN}>`
    : "Invitatii <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `Invitatia ta "${title}" este live!`,
    html: buildHtml(title, url),
  });

  if (error) console.error("[email] Resend error:", error);
}
