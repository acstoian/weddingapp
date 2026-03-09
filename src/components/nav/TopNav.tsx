"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type Lang = "ro" | "en";

const LANG_STORAGE_KEY = "lang";

export default function TopNav() {
  const [activeLang, setActiveLang] = useState<Lang>("ro");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "ro" || stored === "en") {
      setActiveLang(stored);
    }
  }, []);

  function handleLangToggle(lang: Lang) {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    setActiveLang(lang);
    // Set a cookie so server components can read the preference
    document.cookie = `lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
  }

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
        {/* Tier badge */}
        <span
          aria-label="Current plan: Free tier"
          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
        >
          Free
        </span>

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
