import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-100 shadow-sm">
        <Sparkles className="h-10 w-10 text-pink-500" />
      </div>

      {/* Heading */}
      <h2 className="mb-3 font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
        Bine ai venit!
      </h2>

      {/* Description */}
      <p className="mb-8 max-w-md text-base leading-relaxed text-[#9f4070]">
        Creeaza invitatii digitale frumoase pentru momentele tale speciale. De
        la sablon la site live, in cateva minute.
      </p>

      {/* CTA */}
      <Link
        href="/gallery"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#DB2777] px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#be185d] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
      >
        <Sparkles className="h-5 w-5" />
        Creeaza prima ta invitatie
      </Link>
    </div>
  );
}
