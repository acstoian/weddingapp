"use client";

import { useState } from "react";
import { FileDown, MessageCircle, Lock, Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import type { Tier } from "@/lib/feature-gate";

// ────────────────────────────────────────────────
// PdfExportButton
// ────────────────────────────────────────────────

interface PdfExportButtonProps {
  tier: Tier;
  invitationId: string;
  isLive: boolean;
}

/**
 * PdfExportButton — visible to all users.
 *
 * FREE tier: button is disabled, wrapper div is clickable and opens UpgradeModal.
 * GOLD / PLATINUM + isLive=false: size selector shown, Export PDF button disabled with tooltip.
 * GOLD / PLATINUM + isLive=true: size selector + active Export PDF button with real fetch.
 */
export function PdfExportButton({ tier, invitationId, isLive }: PdfExportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<"card" | "pliant">("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = tier === "FREE";

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/export/pdf/${invitationId}?size=${selectedSize}`, {
        method: "POST",
      });
      if (res.status === 429) {
        setError("Serverul este ocupat — Incearca din nou in cateva secunde.");
        return;
      }
      if (!res.ok) {
        setError("Generarea PDF a esuat — Incearca din nou.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invitatie-${selectedSize}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  if (isLocked) {
    return (
      <>
        <div
          className="relative cursor-pointer"
          title="Functie Gold — Cumpara acum"
          onClick={() => setModalOpen(true)}
          aria-label="Export PDF — Functie Gold (click pentru upgrade)"
        >
          <button
            type="button"
            disabled
            aria-label="Export PDF"
            className="inline-flex w-full min-h-[44px] cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 opacity-60 transition-all duration-200"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Export PDF
          </button>
        </div>
        <UpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          trigger="publish"
        />
      </>
    );
  }

  // GOLD / PLATINUM
  return (
    <div className="flex flex-col gap-2">
      {/* Size selector */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setSelectedSize("card")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-150 ${
            selectedSize === "card"
              ? "border-r border-[#DB2777] bg-[#FDF2F8] text-[#DB2777]"
              : "border-r border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Card (10x15cm)
        </button>
        <button
          type="button"
          onClick={() => setSelectedSize("pliant")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-150 ${
            selectedSize === "pliant"
              ? "bg-[#FDF2F8] text-[#DB2777]"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Pliant (15x20cm)
        </button>
      </div>

      {/* Export button */}
      <button
        type="button"
        disabled={!isLive || loading}
        title={!isLive ? "Publica mai intai" : undefined}
        onClick={isLive && !loading ? handleExport : undefined}
        aria-label={loading ? "Se genereaza PDF..." : "Export PDF"}
        className={`inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2 ${
          !isLive || loading
            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
            : "cursor-pointer border-[#DB2777] bg-white text-[#DB2777] hover:bg-[#FDF2F8]"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Se genereaza...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Export PDF
          </>
        )}
      </button>

      {/* Inline error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              handleExport();
            }}
            className="font-medium underline hover:no-underline cursor-pointer"
          >
            Incearca din nou
          </button>
        </div>
      )}

      {/* Caption */}
      <p className="text-xs text-gray-400 text-center">
        PDF-ul reflecta versiunea publicata
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────
// WhatsAppSection
// ────────────────────────────────────────────────

/**
 * WhatsAppSection — visible to all users; disabled for FREE and GOLD tier.
 *
 * FREE / GOLD: section is grayed out with a lock icon overlay. Clicking opens UpgradeModal.
 *   - Tooltip: "Functie Platinum — Cumpara acum"
 * PLATINUM: section is enabled with a placeholder action (bulk WhatsApp send built in a future phase).
 */
export function WhatsAppSection({ tier }: { tier: Tier }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isLocked = tier !== "PLATINUM";

  return (
    <>
      <div
        className={`rounded-xl border p-4 transition-all duration-200 ${
          isLocked
            ? "cursor-pointer select-none border-gray-200 bg-gray-50 opacity-60 hover:opacity-75"
            : "border-green-200 bg-white"
        }`}
        title={isLocked ? "Functie Platinum — Cumpara acum" : undefined}
        onClick={isLocked ? () => setModalOpen(true) : undefined}
        aria-label={isLocked ? "Trimitere WhatsApp — Functie Platinum (click pentru upgrade)" : undefined}
        role={isLocked ? "button" : undefined}
        tabIndex={isLocked ? 0 : undefined}
        onKeyDown={
          isLocked
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setModalOpen(true);
                }
              }
            : undefined
        }
      >
        {/* Section header */}
        <div className="mb-2 flex items-center gap-2">
          {isLocked ? (
            <Lock className="h-4 w-4 text-gray-400" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          )}
          <h3 className="text-sm font-semibold text-gray-900">Trimitere WhatsApp</h3>
        </div>

        {/* Description */}
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          Trimite invitatii direct pe WhatsApp la toata lista ta
        </p>

        {/* CTA button */}
        <button
          type="button"
          disabled={isLocked}
          aria-label={isLocked ? "Deblocat cu Platinum" : "Trimite pe WhatsApp"}
          className={`inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isLocked
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
          }`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {isLocked ? "Deblocat cu Platinum" : "Trimite pe WhatsApp"}
        </button>

        {/* Future feature note for enabled users */}
        {!isLocked && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Functie disponibila curand
          </p>
        )}
      </div>

      {isLocked && (
        <UpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          trigger="publish"
        />
      )}
    </>
  );
}
