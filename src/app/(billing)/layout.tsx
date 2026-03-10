/**
 * Billing route group layout — minimal, standalone (no TopNav).
 * Used for /billing/success and /billing/cancel pages.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
