"use client";

import { useState } from "react";
import { FileDown, MessageCircle, Lock } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import type { Tier } from "@/lib/feature-gate";

// ────────────────────────────────────────────────
// PdfExportButton
// ────────────────────────────────────────────────

/**
 * PdfExportButton — visible to all users; disabled for FREE tier.
 *
 * FREE tier: button is disabled, wrapper div is clickable and opens UpgradeModal.
 *   - Tooltip: "Functie Gold — Cumpara acum"
 * GOLD / PLATINUM: button is enabled with a placeholder action (PDF export is built in a future phase).
 */
export function PdfExportButton({ tier }: { tier: Tier }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isLocked = tier === "FREE";

  return (
    <>
      <div
        className={isLocked ? "relative inline-block cursor-pointer" : "relative inline-block"}
        title={isLocked ? "Functie Gold — Cumpara acum" : undefined}
        onClick={isLocked ? () => setModalOpen(true) : undefined}
        aria-label={isLocked ? "Export PDF — Functie Gold (click pentru upgrade)" : undefined}
      >
        <button
          type="button"
          disabled={isLocked}
          aria-label="Export PDF"
          className={`inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2 ${
            isLocked
              ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60"
              : "border-[#DB2777] bg-white text-[#DB2777] hover:bg-[#FDF2F8] focus-visible:ring-[#DB2777]"
          }`}
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Export PDF
        </button>
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
