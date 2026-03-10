import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import TemplateGallery from "@/components/gallery/TemplateGallery";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Count existing drafts to check free tier limit
  const drafts = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(eq(invitations.userId, userId), eq(invitations.status, "DRAFT"))
    );

  const atLimit = drafts.length >= 3;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-['Playfair_Display',_serif] text-3xl font-semibold text-[#831843]">
          Alege un sablon
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecteaza un sablon pentru a incepe sa creezi invitatia ta digitala
        </p>
      </div>

      <TemplateGallery atLimit={atLimit} />
    </div>
  );
}
