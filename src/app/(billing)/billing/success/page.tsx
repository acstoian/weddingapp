"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, RefreshCw } from "lucide-react";
import type { Tier } from "@/lib/feature-gate";

type PollingState = "checking" | "confirmed" | "timeout";

const TIER_WELCOME: Record<string, string> = {
  GOLD: "Bun venit la Gold! Ai acum: Invitatii nelimitate • Export PDF (in curand)",
  PLATINUM: "Bun venit la Platinum! Ai acum: Invitatii nelimitate • Export PDF (in curand) • WhatsApp bulk send (in curand)",
};

const MAX_POLLS = 10; // 10s at 1s interval

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const returnUrl = searchParams.get("return") ?? "/dashboard";
  const [state, setState] = useState<PollingState>("checking");
  const [confirmedTier, setConfirmedTier] = useState<Tier | null>(null);
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      pollCount.current += 1;

      try {
        const res = await fetch("/api/user/tier");
        if (res.ok) {
          const data = await res.json();
          const tier = data.tier as Tier;

          if (tier !== "FREE") {
            // Payment confirmed — tier has been upgraded
            clearInterval(intervalRef.current!);
            setConfirmedTier(tier);
            setState("confirmed");
            return;
          }
        }
      } catch {
        // Network error — continue polling
      }

      if (pollCount.current >= MAX_POLLS) {
        clearInterval(intervalRef.current!);
        setState("timeout");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-redirect 5s after confirmation
  useEffect(() => {
    if (state !== "confirmed") return;
    const timer = setTimeout(() => {
      router.push(returnUrl);
    }, 5000);
    return () => clearTimeout(timer);
  }, [state, returnUrl, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {/* Checking state */}
        {state === "checking" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF2F8]">
              <RefreshCw className="h-8 w-8 animate-spin text-[#DB2777]" aria-hidden="true" />
            </div>
            <h1 className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
              Se verifica plata...
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Va rugam asteptati cateva secunde.
            </p>
          </>
        )}

        {/* Confirmed state */}
        {state === "confirmed" && confirmedTier && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <h1 className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
              Plata confirmata!
            </h1>

            {/* Tier-specific welcome card */}
            <div className="mt-4 rounded-xl bg-[#FDF2F8] p-4 text-left">
              <p className="text-sm text-gray-700 leading-relaxed">
                {TIER_WELCOME[confirmedTier] ?? `Planul ${confirmedTier} este acum activ.`}
              </p>
            </div>

            <p className="mt-4 text-sm text-gray-400">
              Vei fi redirectionat automat in 5 secunde...
            </p>

            <Link
              href={returnUrl}
              className="mt-4 inline-block rounded-xl bg-[#DB2777] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#BE185D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
            >
              Mergi la dashboard
            </Link>
          </>
        )}

        {/* Timeout state */}
        {state === "timeout" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <RefreshCw className="h-8 w-8 text-amber-600" aria-hidden="true" />
            </div>
            <h1 className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
              Verificare in curs...
            </h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Plata a fost primita, dar verificarea a durat mai mult ca de obicei.
              Reincarca pagina sau mergi la dashboard.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className="cursor-pointer rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              >
                Reincarca
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#DB2777] px-5 py-2.5 text-sm font-semibold text-white text-center transition-colors duration-150 hover:bg-[#BE185D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
              >
                Mergi la dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
