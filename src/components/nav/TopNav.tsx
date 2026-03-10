"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { Tier } from "@/lib/feature-gate";

type Lang = "ro" | "en";

const LANG_STORAGE_KEY = "lang";

const TIER_BADGE: Record<Tier, { label: string; className: string }> = {
  FREE: { label: "Free", className: "bg-gray-100 text-gray-600" },
  GOLD: { label: "Gold", className: "bg-amber-100 text-amber-700" },
  PLATINUM: { label: "Platinum", className: "bg-purple-100 text-purple-700" },
};

export default function TopNav() {
  const [activeLang, setActiveLang] = useState<Lang>("ro");
  const [tier, setTier] = useState<Tier>("FREE");

  // Load lang preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "ro" || stored === "en") {
      setActiveLang(stored);
    }
  }, []);

  // Fetch user's current tier from API
  useEffect(() => {
    fetch("/api/user/tier")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tier && (data.tier === "FREE" || data.tier === "GOLD" || data.tier === "PLATINUM")) {
          setTier(data.tier as Tier);
        }
      })
      .catch(() => {
        // Silently ignore — default FREE is shown
      });
  }, []);

  function handleLangToggle(lang: Lang) {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    setActiveLang(lang);
    // Set a cookie so server components can read the preference
    document.cookie = `lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
  }

  const badge = TIER_BADGE[tier];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b border-gray-200 bg-white/90 px-6 backdrop-blur-sm"
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 transition-colors duration-200 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
      >
        Save the Date
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {/* Preturi link */}
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-600 transition-colors duration-150 hover:text-[#DB2777] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2 rounded"
        >
          Preturi
        </Link>

        {/* Tier badge — links to pricing page */}
        <Link
          href="/pricing"
          aria-label={`Planul tau actual: ${badge.label}`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity duration-150 hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2 ${badge.className}`}
        >
          {badge.label}
        </Link>

        {/* Language toggle */}
        <div
          role="group"
          aria-label="Language selection"
          className="flex items-center rounded-lg border border-gray-200 p-0.5"
        >
          <button
            onClick={() => handleLangToggle("ro")}
            aria-pressed={activeLang === "ro"}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 ${
              activeLang === "ro"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            RO
          </button>
          <button
            onClick={() => handleLangToggle("en")}
            aria-pressed={activeLang === "en"}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 ${
              activeLang === "en"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            EN
          </button>
        </div>

        {/* Clerk account menu */}
        <UserButton />
      </div>
    </nav>
  );
}
