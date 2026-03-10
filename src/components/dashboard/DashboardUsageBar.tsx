"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import type { Tier } from "@/lib/feature-gate";

interface Props {
  draftCount: number;
  liveCount: number;
  tier: Tier;
}

const FREE_DRAFT_LIMIT = 3;
const FREE_LIVE_LIMIT = 1;

/**
 * DashboardUsageBar — client component.
 * Shows usage indicators for FREE users and an upgrade prompt when at limit.
 * Renders nothing for GOLD/PLATINUM users.
 */
export default function DashboardUsageBar({ draftCount, liveCount, tier }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show usage bar for FREE tier
  if (tier !== "FREE") return null;

  const draftAtLimit = draftCount >= FREE_DRAFT_LIMIT;
  const liveAtLimit = liveCount >= FREE_LIVE_LIMIT;
  const atAnyLimit = draftAtLimit || liveAtLimit;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        {/* Draft usage */}
        <span
          className={`text-sm ${draftAtLimit ? "font-semibold text-[#DB2777]" : "text-gray-500"}`}
        >
          {draftCount}/{FREE_DRAFT_LIMIT} ciorne
        </span>

        <span className="text-gray-200" aria-hidden="true">•</span>

        {/* Live usage */}
        <span
          className={`text-sm ${liveAtLimit ? "font-semibold text-[#DB2777]" : "text-gray-500"}`}
        >
          {liveCount}/{FREE_LIVE_LIMIT} publicate
        </span>

        {/* Upgrade prompt when at any limit */}
        {atAnyLimit && (
          <>
            <span className="text-gray-200" aria-hidden="true">•</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#DB2777] transition-opacity duration-150 hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-1 rounded"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              Upgrade
            </button>
          </>
        )}
      </div>

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trigger={liveAtLimit ? "publish" : "draft"}
      />
    </>
  );
}
