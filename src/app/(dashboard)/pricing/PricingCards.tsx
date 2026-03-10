"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Tier } from "@/lib/feature-gate";

interface Props {
  tier: Tier | null; // null = unauthenticated guest
  isDevMode: boolean;
}

interface TierData {
  id: "FREE" | "GOLD" | "PLATINUM";
  name: string;
  price: string;
  priceNote?: string;
  badgeText?: string;
  badgeColor?: string;
  accentClass: string;
  ringClass: string;
  features: string[];
  highlighted: boolean;
}

const TIERS: TierData[] = [
  {
    id: "FREE",
    name: "Free",
    price: "0 RON",
    accentClass: "text-gray-500",
    ringClass: "border-gray-200",
    features: [
      "3 ciorne simultan",
      "1 invitatie publicata",
      "Sabloane de baza",
      "Link de partajare",
    ],
    highlighted: false,
  },
  {
    id: "GOLD",
    name: "Gold",
    price: "99 RON",
    priceNote: "acces permanent",
    badgeText: "Popular",
    badgeColor: "bg-[#DB2777] text-white",
    accentClass: "text-[#DB2777]",
    ringClass: "ring-2 ring-[#DB2777]",
    features: [
      "Invitatii nelimitate",
      "Export PDF (A4/A5)",
      "Toate sabloanele",
      "Link de partajare",
      "Suport prioritar",
    ],
    highlighted: true,
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    price: "149 RON",
    priceNote: "acces permanent",
    accentClass: "text-[#CA8A04]",
    ringClass: "ring-2 ring-[#CA8A04]",
    features: [
      "Tot ce include Gold",
      "Trimitere bulk WhatsApp",
      "Gestionare lista invitati",
      "Manager de cont dedicat",
    ],
    highlighted: false,
  },
];

export default function PricingCards({ tier, isDevMode: _isDevMode }: Props) {
  const [loadingTier, setLoadingTier] = useState<"GOLD" | "PLATINUM" | null>(null);

  async function handleCheckout(targetTier: "GOLD" | "PLATINUM") {
    // If guest — redirect to sign-up
    if (!tier) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    setLoadingTier(targetTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier, returnUrl: "/dashboard" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[PricingCards] Checkout error:", data.error ?? res.status);
        setLoadingTier(null);
      }
    } catch (err) {
      console.error("[PricingCards] Checkout error:", err);
      setLoadingTier(null);
    }
  }

  function getCta(tierData: TierData): { label: string; disabled: boolean; onClick?: () => void } {
    const { id } = tierData;

    if (id === "FREE") {
      if (!tier) {
        return { label: "Incepe gratuit", disabled: false, onClick: () => { window.location.href = "/sign-up"; } };
      }
      if (tier === "FREE") {
        return { label: "Planul tau actual", disabled: true };
      }
      // GOLD or PLATINUM user looking at Free — can't downgrade via UI
      return { label: "Plan inclus", disabled: true };
    }

    if (id === "GOLD") {
      if (!tier || tier === "FREE") {
        return { label: "Cumpara acum — 99 RON", disabled: false, onClick: () => handleCheckout("GOLD") };
      }
      if (tier === "GOLD") {
        return { label: "Planul tau actual", disabled: true };
      }
      // PLATINUM — already past Gold
      return { label: "Plan inclus in Platinum", disabled: true };
    }

    // PLATINUM
    if (!tier || tier === "FREE") {
      return { label: "Cumpara acum — 149 RON", disabled: false, onClick: () => handleCheckout("PLATINUM") };
    }
    if (tier === "GOLD") {
      return { label: "Upgrade la Platinum — 50 RON", disabled: false, onClick: () => handleCheckout("PLATINUM") };
    }
    // tier === PLATINUM
    return { label: "Planul tau actual", disabled: true };
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {TIERS.map((tierData) => {
        const cta = getCta(tierData);
        const isCurrentTier = tier === tierData.id;

        return (
          <div
            key={tierData.id}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md ${tierData.ringClass}`}
          >
            {/* Badge */}
            {tierData.badgeText && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold ${tierData.badgeColor}`}
              >
                {tierData.badgeText}
              </span>
            )}

            {/* Header */}
            <h2 className={`text-xl font-bold ${tierData.accentClass}`}>{tierData.name}</h2>

            {/* Price */}
            <div className="my-4">
              <span className="font-['Playfair_Display',_serif] text-3xl font-semibold text-[#831843]">
                {tierData.price}
              </span>
              {tierData.priceNote && (
                <span className="ml-2 text-xs text-gray-400">{tierData.priceNote}</span>
              )}
            </div>

            {/* Permanent access badge for paid tiers */}
            {tierData.id !== "FREE" && (
              <span
                className={`mb-4 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tierData.id === "GOLD"
                    ? "bg-pink-50 text-[#DB2777]"
                    : "bg-amber-50 text-[#CA8A04]"
                }`}
              >
                Acces permanent
              </span>
            )}

            {/* Feature list */}
            <ul className="mb-6 flex flex-col gap-2.5 flex-1">
              {tierData.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#DB2777]" aria-hidden="true" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={cta.onClick}
              disabled={cta.disabled || loadingTier !== null}
              className={`mt-auto w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                cta.disabled || isCurrentTier
                  ? "cursor-default bg-gray-100 text-gray-400"
                  : tierData.id === "GOLD"
                    ? "cursor-pointer bg-[#DB2777] text-white hover:bg-[#BE185D] focus-visible:ring-[#DB2777]"
                    : tierData.id === "PLATINUM"
                      ? "cursor-pointer bg-[#CA8A04] text-white hover:bg-[#A16207] focus-visible:ring-[#CA8A04]"
                      : "cursor-pointer bg-gray-900 text-white hover:bg-gray-700 focus-visible:ring-gray-900"
              }`}
            >
              {loadingTier && tierData.id === loadingTier ? "Se incarca..." : cta.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
