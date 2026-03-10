"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "Ce include accesul permanent?",
    a: "Planul Gold si Platinum ofera acces nelimitat in timp. Platesti o singura data si beneficiezi de toate functiile pentru totdeauna, fara taxe lunare sau anuale.",
  },
  {
    q: "Ce se intampla cu invitatiile mele dupa plata?",
    a: "Invitatiile tale raman live si le poti actualiza oricand. Dupa upgrade, poti publica invitatii noi fara restrictii.",
  },
  {
    q: "Cum platesc?",
    a: "Acceptam card bancar, Google Pay si Apple Pay prin Stripe — procesator de plati securizat. Nu stocam datele cardului.",
  },
  {
    q: "Pot face upgrade de la Gold la Platinum?",
    a: "Da! Diferenta este de 50 RON. Poti face upgrade oricand din pagina de preturi sau din contul tau.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={faq.q}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 bg-white px-5 py-4 text-left transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#DB2777]"
            >
              <span className="text-sm font-medium text-gray-900">{faq.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className="bg-gray-50 px-5 pb-4 pt-2">
                <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
