"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { InvitationFields } from "@/lib/templates/schema";

/**
 * Map templateId → component filename.
 * Component file names follow PascalCase: MinimalWedding1, etc.
 */
function templateIdToComponent(templateId: string): string {
  // "minimal-wedding-1" → "MinimalWedding1"
  return templateId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

interface LivePreviewProps {
  templateId: string;
  fields: InvitationFields;
}

// Skeleton shown while dynamic import loads
function PreviewSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-full max-w-sm space-y-4 animate-pulse">
        <div className="h-8 bg-[#FBCFE8] rounded-xl w-3/4 mx-auto" />
        <div className="h-4 bg-[#FBCFE8] rounded w-1/2 mx-auto" />
        <div className="h-40 bg-[#FBCFE8] rounded-xl w-full" />
        <div className="h-4 bg-[#FBCFE8] rounded w-2/3 mx-auto" />
        <div className="h-4 bg-[#FBCFE8] rounded w-1/2 mx-auto" />
      </div>
    </div>
  );
}

type TemplateComponent = React.ComponentType<InvitationFields>;

// Map of templateId → lazy-loaded component
const templateComponents: Record<string, TemplateComponent> = {
  "minimal-wedding-1": dynamic<InvitationFields>(
    () => import("@/components/templates/MinimalWedding1"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
  "minimal-wedding-2": dynamic<InvitationFields>(
    () => import("@/components/templates/MinimalWedding2"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
  "minimal-wedding-3": dynamic<InvitationFields>(
    () => import("@/components/templates/MinimalWedding3"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
  "decorative-wedding-1": dynamic<InvitationFields>(
    () => import("@/components/templates/DecorativeWedding1"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
  "minimal-baptism-1": dynamic<InvitationFields>(
    () => import("@/components/templates/MinimalBaptism1"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
  "minimal-baptism-2": dynamic<InvitationFields>(
    () => import("@/components/templates/MinimalBaptism2"),
    { ssr: false, loading: () => <PreviewSkeleton /> }
  ),
};

function FallbackComponent() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">
      Sablon indisponibil
    </div>
  );
}

export default function LivePreview({ templateId, fields }: LivePreviewProps) {
  const TemplateComponent: TemplateComponent =
    templateComponents[templateId] ?? FallbackComponent;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <TemplateComponent {...fields} />
    </div>
  );
}

// Keep templateIdToComponent for potential future use
export { templateIdToComponent };
