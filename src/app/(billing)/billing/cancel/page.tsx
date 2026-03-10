import Link from "next/link";
import { XCircle } from "lucide-react";

/**
 * /billing/cancel — shown when user cancels Stripe Checkout.
 * No charge was made. Offers navigation back to pricing or dashboard.
 */
export default function BillingCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <XCircle className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>

        <h1 className="font-['Playfair_Display',_serif] text-2xl font-semibold text-[#831843]">
          Plata anulata
        </h1>

        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          Nu ai fost taxat. Poti incerca din nou oricand.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="rounded-xl bg-[#DB2777] px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#BE185D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
          >
            Inapoi la preturi
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            Mergi la dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
