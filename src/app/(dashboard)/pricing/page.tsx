import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Tier } from "@/lib/feature-gate";
import PricingCards from "./PricingCards";

export const dynamic = "force-dynamic";

/**
 * Pricing page — server component.
 * Fetches user's current tier server-side and passes to PricingCards client component.
 */
export default async function PricingPage() {
  const { userId } = await auth();

  let tier: Tier | null = null;
  if (userId) {
    const [user] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId));
    tier = (user?.tier ?? "FREE") as Tier;
  }

  const isDevMode = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero section */}
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-['Playfair_Display',_serif] text-4xl font-semibold leading-tight text-[#831843] sm:text-5xl">
          Preturi simple, acces permanent
        </h1>
        <ul className="mt-6 flex flex-col items-center gap-2">
          {[
            "Template → site live in minute",
            "Acces permanent — fara taxe lunare",
            "Trimite prin link, PDF sau WhatsApp",
          ].map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-gray-600 sm:text-base">
              <span className="h-1.5 w-1.5 rounded-full bg-[#DB2777] shrink-0" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Social proof bar */}
      <section className="bg-gray-50 py-6">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-4">
          {[
            "200+ cupluri fericite",
            "4.9/5 rating",
            "Sub 2 minute publicare",
          ].map((stat) => (
            <span
              key={stat}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200"
            >
              {stat}
            </span>
          ))}
        </div>
      </section>

      {/* Tier cards (client component for interactive CTAs) */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <PricingCards tier={tier} isDevMode={isDevMode} />
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 font-['Playfair_Display',_serif] text-2xl font-semibold text-center text-[#831843]">
          Comparatie planuri
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 w-2/5">Functie</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Free</th>
                <th className="px-4 py-3 text-center font-semibold text-[#DB2777]">Gold</th>
                <th className="px-4 py-3 text-center font-semibold text-[#CA8A04]">Platinum</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-4 py-3 text-gray-700 font-medium">{row.feature}</td>
                  <td className="px-4 py-3 text-center"><ComparisonCell value={row.free} /></td>
                  <td className="px-4 py-3 text-center"><ComparisonCell value={row.gold} /></td>
                  <td className="px-4 py-3 text-center"><ComparisonCell value={row.platinum} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
        <h2 className="mb-6 font-['Playfair_Display',_serif] text-2xl font-semibold text-center text-[#831843]">
          Intrebari frecvente
        </h2>
        <FaqAccordion />
      </section>

      {/* Footer note */}
      <footer className="pb-16 text-center">
        <p className="text-sm text-gray-400">
          Ai intrebari?{" "}
          <a
            href="mailto:contact@savethedate.ro"
            className="text-[#DB2777] underline underline-offset-2 transition-opacity duration-150 hover:opacity-75"
          >
            contact@savethedate.ro
          </a>
        </p>
      </footer>

      {/* Dev-only Stripe test badge */}
      {isDevMode && (
        <div className="fixed bottom-4 right-4 z-40 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          Stripe Test Mode
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Comparison table data & helper
// ────────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  free: string | true | false;
  gold: string | true | false;
  platinum: string | true | false;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  // Invitatii
  { feature: "Ciorne simultane", free: "3", gold: "Nelimitat", platinum: "Nelimitat" },
  { feature: "Invitatii publicate", free: "1", gold: "Nelimitat", platinum: "Nelimitat" },
  // Distributie
  { feature: "Link de partajare", free: true, gold: true, platinum: true },
  { feature: "Export PDF (A4/A5)", free: false, gold: true, platinum: true },
  { feature: "Trimitere bulk WhatsApp", free: false, gold: false, platinum: true },
  // Suport
  { feature: "Suport email", free: true, gold: true, platinum: true },
  { feature: "Suport prioritar", free: false, gold: true, platinum: true },
  { feature: "Manager de cont dedicat", free: false, gold: false, platinum: true },
];

function ComparisonCell({ value }: { value: string | true | false }) {
  if (value === true) {
    return (
      <span className="inline-flex justify-center">
        <svg className="h-4 w-4 text-[#DB2777]" viewBox="0 0 20 20" fill="currentColor" aria-label="Inclus">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex justify-center">
        <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-label="Neinclus">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  return <span className="text-gray-700 font-medium">{value}</span>;
}

// ────────────────────────────────────────────────
// FAQ Accordion — client component embedded inline
// ────────────────────────────────────────────────

// We need useState so this sub-section needs to be separated.
// Import it from a small client component file.
import FaqAccordion from "./FaqAccordion";
