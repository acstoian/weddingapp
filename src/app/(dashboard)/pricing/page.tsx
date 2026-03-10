import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaDisabled?: boolean;
  highlight?: boolean;
  badge?: string;
}

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "0 lei",
    description: "Perfect pentru inceput",
    features: [
      "3 ciorne simultan",
      "1 invitatie publicata",
      "Sabloane de baza",
      "Link de partajare",
      "Actualizari nelimitate",
    ],
    cta: "Planul tau actual",
    ctaDisabled: true,
    badge: "Plan actual",
  },
  {
    name: "Gold",
    price: "49 lei/luna",
    description: "Pentru evenimente speciale",
    features: [
      "Invitatii nelimitate",
      "Export PDF",
      "Sabloane premium",
      "Suport prioritar",
      "Analize si statistici",
      "Domeniu personalizat",
    ],
    cta: "In curand",
    ctaDisabled: true,
    highlight: true,
  },
  {
    name: "Platinum",
    price: "99 lei/luna",
    description: "Pentru planificatori si agentii",
    features: [
      "Tot ce include Gold",
      "Trimitere bulk WhatsApp",
      "Gestionare multi-eveniment",
      "Manager de cont dedicat",
      "API access",
      "White-label",
    ],
    cta: "In curand",
    ctaDisabled: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="font-['Playfair_Display',_serif] text-4xl font-semibold text-[#831843]">
          Planuri si preturi
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Alege planul potrivit pentru momentul tau special
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 shadow-sm",
              tier.highlight
                ? "border-[#DB2777] bg-white ring-2 ring-[#DB2777]/20"
                : "border-[#FBCFE8] bg-white"
            )}
          >
            {/* Badge */}
            {tier.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-0.5 text-xs font-semibold text-white">
                {tier.badge}
              </span>
            )}
            {tier.highlight && !tier.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#DB2777] px-3 py-0.5 text-xs font-semibold text-white">
                Popular
              </span>
            )}

            {/* Tier name */}
            <h2 className="text-xl font-bold text-[#831843]">{tier.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{tier.description}</p>

            {/* Price */}
            <div className="my-4">
              <span className="font-['Playfair_Display',_serif] text-3xl font-semibold text-[#831843]">
                {tier.price}
              </span>
            </div>

            {/* Feature list */}
            <ul className="mb-6 flex flex-col gap-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#DB2777]" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-auto">
              <button
                type="button"
                disabled={tier.ctaDisabled}
                title={tier.ctaDisabled && tier.name !== "Free" ? "In curand" : undefined}
                className={cn(
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200",
                  "min-h-[44px]",
                  tier.name === "Free"
                    ? "cursor-default bg-gray-100 text-gray-500"
                    : tier.highlight
                      ? "cursor-not-allowed bg-[#DB2777]/40 text-white"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                )}
              >
                {tier.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
