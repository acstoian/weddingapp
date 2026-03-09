import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTemplate } from "@/lib/templates/registry";

/**
 * Root page has two modes:
 * - Admin app (INVITATION_ID not set): redirect to /dashboard
 * - Invitation deployment (INVITATION_ID set via Vercel env var): render the
 *   public invitation template so guests can view the live invitation.
 */

export async function generateMetadata(): Promise<Metadata> {
  const invitationId = process.env.INVITATION_ID;
  if (!invitationId) return { title: "Save the Date" };

  const [invitation] = await db
    .select({ title: invitations.title })
    .from(invitations)
    .where(eq(invitations.id, invitationId));

  return { title: invitation?.title || "Invitatie" };
}

export default async function RootPage() {
  const invitationId = process.env.INVITATION_ID;

  if (!invitationId) {
    redirect("/dashboard");
  }

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId));

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Invitatie negasita.
      </div>
    );
  }

  let template;
  try {
    template = getTemplate(invitation.templateId);
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Template indisponibil.
      </div>
    );
  }

  const TemplateComponent = template.component;

  return (
    <>
      {template.googleFonts.length > 0 && (
        // React 19 hoists <link> tags to <head> automatically
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${template.googleFonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`}
        />
      )}
      <TemplateComponent {...invitation.fields} />
    </>
  );
}
