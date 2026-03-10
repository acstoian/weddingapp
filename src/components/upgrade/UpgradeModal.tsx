"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Zap, Crown } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trigger: "publish" | "draft";
}

interface TierCard {
  id: "GOLD" | "PLATINUM";
  name: string;
  price: string;
  icon: React.ReactNode;
  accentColor: string;
  ringColor: string;
  benefits: string[];
  highlighted: boolean;
}

const TIER_CARDS: TierCard[] = [
  {
    id: "GOLD",
    name: "Gold",
    price: "99 RON",
    icon: <Zap className="h-5 w-5" aria-hidden="true" />,
    accentColor: "text-[#DB2777]",
    ringColor: "ring-2 ring-[#DB2777]",
    benefits: ["Invitatii nelimitate", "Export PDF (A4/A5)", "Toate sabloanele", "Suport prioritar"],
    highlighted: true,
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    price: "149 RON",
    icon: <Crown className="h-5 w-5" aria-hidden="true" />,
    accentColor: "text-[#CA8A04]",
    ringColor: "ring-2 ring-[#CA8A04]",
    benefits: ["Tot ce include Gold", "Trimitere bulk WhatsApp", "Gestionare lista invitati", "Manager cont dedicat"],
    highlighted: false,
  },
];

export function UpgradeModal({ isOpen, onClose, trigger }: Props) {
  const [loadingTier, setLoadingTier] = useState<"GOLD" | "PLATINUM" | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleCheckout(targetTier: "GOLD" | "PLATINUM") {
    setLoadingTier(targetTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier, returnUrl: window.location.pathname }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("[UpgradeModal] Checkout error:", err);
      setLoadingTier(null);
    }
  }

  const heading =
    trigger === "publish"
      ? "Publica invitatii nelimitate"
      : "Creeaza mai multe ciorne";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade plan"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Inchide"
          className="absolute right-4 top-4 cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Heading */}
        <div className="mb-6 pr-8">
          <h2 className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
            Deblochează mai mult
          </h2>
          <p className="mt-1 text-sm text-gray-500">{heading}</p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-2 gap-4">
          {TIER_CARDS.map((card) => (
            <div
              key={card.id}
              className={`flex flex-col rounded-xl border p-4 ${card.highlighted ? card.ringColor + " bg-[#FDF2F8]" : "border-[#E5E7EB] bg-white"}`}
            >
              {/* Tier header */}
              <div className={`flex items-center gap-2 mb-3 ${card.accentColor}`}>
                {card.icon}
                <span className="font-semibold text-sm">{card.name}</span>
              </div>

              {/* Price */}
              <div className="mb-3">
                <span className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
                  {card.price}
                </span>
                <span className="ml-1 text-xs text-gray-400">acces permanent</span>
              </div>

              {/* Benefits */}
              <ul className="mb-4 flex flex-col gap-1.5 flex-1">
                {card.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#DB2777]" aria-hidden="true" />
                    <span className="text-xs text-gray-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(card.id)}
                disabled={loadingTier !== null}
                className={`w-full cursor-pointer rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 min-h-[44px] ${
                  card.highlighted
                    ? "bg-[#DB2777] hover:bg-[#BE185D] focus-visible:ring-[#DB2777] disabled:opacity-60"
                    : "bg-[#CA8A04] hover:bg-[#A16207] focus-visible:ring-[#CA8A04] disabled:opacity-60"
                }`}
              >
                {loadingTier === card.id ? "Se incarca..." : `Cumpara ${card.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Plata o singura data · Acces permanent · Fara taxe recurente
        </p>
      </div>
    </div>
  );
}
