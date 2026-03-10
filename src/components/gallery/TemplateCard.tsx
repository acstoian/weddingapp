"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TemplateDefinition } from "@/lib/templates/registry";

const CATEGORY_LABELS: Record<string, string> = {
  WEDDING: "Nunta",
  BAPTISM: "Botez",
};

interface TemplateCardProps {
  template: TemplateDefinition;
  onClick: (templateId: string) => void;
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  const categoryLabel =
    CATEGORY_LABELS[template.category] ?? template.category;

  return (
    <button
      type="button"
      onClick={() => onClick(template.id)}
      className={cn(
        "group w-full cursor-pointer overflow-hidden rounded-2xl border border-[#FBCFE8] bg-white",
        "shadow-sm transition-shadow duration-200 hover:shadow-md",
        "text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
      )}
    >
      {/* Thumbnail — aspect-ratio 2/3 (portrait) */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100" style={{ aspectRatio: "2/3" }}>
        <Image
          src={template.thumbnailUrl}
          alt={`${template.name} preview`}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-semibold text-[#831843]">
          {template.name}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            template.category === "WEDDING"
              ? "bg-pink-100 text-pink-700"
              : "bg-sky-100 text-sky-700"
          )}
        >
          {categoryLabel}
        </span>
      </div>
    </button>
  );
}
