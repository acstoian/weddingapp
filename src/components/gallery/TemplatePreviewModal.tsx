"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { X, Monitor, Smartphone, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { templates } from "@/lib/templates/registry";
import type { InvitationFields } from "@/lib/templates/schema";

// ---- Preview fixture --------------------------------------------------------

const PREVIEW_FIXTURE: InvitationFields = {
  title: "Elena & Andrei",
  names: "Elena & Andrei",
  eventDatetime: "2026-08-15T16:00:00Z",
  venueName: "Catedrala Sfantul Iosif",
  venueAddress: "Calea Victoriei 56, Bucuresti",
  personalMessage: "Va asteptam cu drag la nunta noastra.",
  dresscodeRsvpNote: "Smart casual",
};

// ---- Template component name mapping ----------------------------------------
// 'minimal-wedding-1' → 'MinimalWedding1'

function templateIdToComponentName(id: string): string {
  return id
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

// ---- Dynamic template loader ------------------------------------------------
// We keep a cache of dynamic components per templateId to avoid re-loading.

const componentCache: Record<
  string,
  React.ComponentType<InvitationFields>
> = {};

function getDynamicComponent(
  templateId: string
): React.ComponentType<InvitationFields> {
  if (!componentCache[templateId]) {
    const componentName = templateIdToComponentName(templateId);
    componentCache[templateId] = dynamic(
      () =>
        import(`@/components/templates/${componentName}`).then(
          (mod) => mod.default ?? mod
        ),
      {
        ssr: false,
        loading: () => (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          </div>
        ),
      }
    ) as React.ComponentType<InvitationFields>;
  }
  return componentCache[templateId];
}

// ---- Props ------------------------------------------------------------------

interface TemplatePreviewModalProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

// ---- Component --------------------------------------------------------------

export default function TemplatePreviewModal({
  templateId,
  open,
  onClose,
}: TemplatePreviewModalProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);
  const TemplateComponent = getDynamicComponent(templateId);

  const handleUseTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      if (res.status === 201) {
        const { invitation } = await res.json();
        router.push(`/editor/${invitation.id}`);
        return;
      }

      if (res.status === 403) {
        const body = await res.json();
        setError(
          body.error ??
            "Ai atins limita de ciorne. Publica sau sterge o invitatie existenta."
        );
        onClose();
        return;
      }

      const body = await res.json();
      setError(body.error ?? "A aparut o eroare. Incearca din nou.");
    } catch {
      setError("A aparut o eroare de retea. Incearca din nou.");
    } finally {
      setIsLoading(false);
    }
  }, [templateId, router, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={template ? `Previzualizare ${template.name}` : "Previzualizare sablon"}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#FBCFE8] px-4 sm:px-6">
        {/* Template name (left) */}
        <span className="font-['Playfair_Display',_serif] text-lg font-semibold text-[#831843]">
          {template?.name ?? "Sablon"}
        </span>

        {/* Desktop / Mobile toggle (center) */}
        <div className="flex items-center gap-1 rounded-xl border border-[#FBCFE8] p-1">
          <button
            type="button"
            onClick={() => setViewMode("desktop")}
            aria-label="Previzualizare desktop"
            aria-pressed={viewMode === "desktop"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]",
              viewMode === "desktop"
                ? "bg-[#DB2777] text-white"
                : "text-gray-500 hover:text-[#DB2777]"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mobile")}
            aria-label="Previzualizare mobil"
            aria-pressed={viewMode === "mobile"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]",
              viewMode === "mobile"
                ? "bg-[#DB2777] text-white"
                : "text-gray-500 hover:text-[#DB2777]"
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        {/* Close button (right) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Inchide previzualizarea"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FBCFE8] text-gray-500 transition-colors hover:border-[#DB2777] hover:text-[#DB2777] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview area */}
      <div className="relative flex flex-1 overflow-hidden bg-gray-100">
        {viewMode === "desktop" ? (
          // Desktop: full width scrollable
          <div className="h-full w-full overflow-y-auto bg-white">
            <TemplateComponent {...PREVIEW_FIXTURE} />
          </div>
        ) : (
          // Mobile: centered 375px frame
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            <div
              className="relative overflow-y-auto rounded-[2rem] border-4 border-gray-800 bg-white shadow-2xl"
              style={{ width: "375px", height: "667px", maxHeight: "90vh" }}
            >
              {/* Notch decoration */}
              <div className="sticky top-0 z-10 flex h-6 items-center justify-center bg-gray-800">
                <div className="h-1.5 w-16 rounded-full bg-gray-600" />
              </div>
              <div className="overflow-y-auto" style={{ height: "calc(100% - 24px)" }}>
                <TemplateComponent {...PREVIEW_FIXTURE} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#FBCFE8] px-4 py-3 sm:px-6">
        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!error && <div />}

        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-xl border border-[#FBCFE8] px-4 py-2",
              "text-sm font-medium text-[#831843] transition-colors hover:border-[#DB2777] hover:text-[#DB2777]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777]"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Inapoi la galerie</span>
          </button>

          {/* Use this template */}
          <button
            type="button"
            onClick={handleUseTemplate}
            disabled={isLoading}
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-xl bg-[#DB2777] px-5 py-2",
              "text-sm font-semibold text-white shadow-sm transition-all duration-200",
              "hover:bg-[#be185d] hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Foloseste acest sablon
          </button>
        </div>
      </div>
    </div>
  );
}
