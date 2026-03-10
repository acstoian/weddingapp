import { Resend } from "resend";

function createResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function buildPublishHtml(title: string, url: string): string {
  return `<div style="font-family:sans-serif;max-width:600px">
    <h2>Invitatia ta este live!</h2>
    <p><strong>${title}</strong> este acum disponibila la:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Poti distribui acest link invitatilor tai.</p>
  </div>`;
}

function buildPurchaseHtml(tier: string): string {
  const tierFeatures: Record<string, string[]> = {
    GOLD: ["Pana la 3 invitatii draft", "Publicare invitatii", "Personalizare completa"],
    PLATINUM: ["Invitatii nelimitate", "Publicare invitatii", "WhatsApp Business", "PDF export", "Toate functiile Gold"],
  };
  const features = tierFeatures[tier] ?? [];
  const featureList = features.map((f) => `<li>${f}</li>`).join("");

  return `<div style="font-family:sans-serif;max-width:600px">
    <h2>Multumim pentru achizitie!</h2>
    <p>Planul tau <strong>${tier}</strong> este acum activ.</p>
    <h3>Functii disponibile:</h3>
    <ul>${featureList}</ul>
    <p>Bucura-te de noile functii!</p>
  </div>`;
}

function getSenderAddress(): string {
  return process.env.RESEND_FROM_DOMAIN
    ? `Invitatii <no-reply@${process.env.RESEND_FROM_DOMAIN}>`
    : "Invitatii <onboarding@resend.dev>";
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

  const { error } = await resend.emails.send({
    from: getSenderAddress(),
    to: [to],
    subject: `Invitatia ta "${title}" este live!`,
    html: buildPublishHtml(title, url),
  });

  if (error) console.error("[email] Resend error:", error);
}

/**
 * Sends a purchase confirmation email via Resend.
 * Gracefully skips if RESEND_API_KEY is not configured.
 * Does NOT throw — email failure must not block the webhook response.
 */
export async function sendPurchaseConfirmationEmail(params: {
  email: string;
  tier: string;
}): Promise<void> {
  const resend = createResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping purchase confirmation email");
    return;
  }

  const { error } = await resend.emails.send({
    from: getSenderAddress(),
    to: [params.email],
    subject: `Plata confirmata — ${params.tier}`,
    html: buildPurchaseHtml(params.tier),
  });

  if (error) console.error("[email] Resend error:", error);
}

/**
 * emailService object — convenience wrapper for fire-and-forget usage
 * in webhook handlers and other async contexts.
 */
export const emailService = {
  sendPurchaseConfirmation: sendPurchaseConfirmationEmail,
  sendPublishSuccess: sendPublishSuccessEmail,
};
