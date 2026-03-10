"use client";

import { useState } from "react";
import { templates } from "@/lib/templates/registry";
import TemplateCard from "./TemplateCard";
import FreeLimitBanner from "./FreeLimitBanner";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { cn } from "@/lib/utils";

type FilterTab = "ALL" | "WEDDING" | "BAPTISM";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "ALL", label: "Toate (6)" },
  { id: "WEDDING", label: "Nunta (4)" },
  { id: "BAPTISM", label: "Botez (2)" },
];

interface TemplateGalleryProps {
  atLimit: boolean;
}

export default function TemplateGallery({ atLimit }: TemplateGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const filtered = templates.filter((t) =>
    activeFilter === "ALL" ? true : t.category === activeFilter
  );

  return (
    <div>
      {/* Free limit banner */}
      {atLimit && <FreeLimitBanner />}

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              "min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2",
              activeFilter === tab.id
                ? "bg-[#DB2777] text-white shadow-sm"
                : "bg-white text-[#831843] border border-[#FBCFE8] hover:border-[#DB2777] hover:text-[#DB2777]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template grid — 2 cols mobile, 3 cols lg */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={(id) => setSelectedTemplateId(id)}
          />
        ))}
      </div>

      {/* Preview modal */}
      {selectedTemplateId && (
        <TemplatePreviewModal
          templateId={selectedTemplateId}
          open={true}
          onClose={() => setSelectedTemplateId(null)}
        />
      )}
    </div>
  );
}
