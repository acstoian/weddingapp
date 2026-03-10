import { AlertTriangle } from "lucide-react";

export default function FreeLimitBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-semibold text-amber-800">
          Limita de ciorne atinsa
        </p>
        <p className="mt-0.5 text-sm text-amber-700">
          Ai atins limita de 3 ciorne. Publica sau sterge o invitatie existenta
          pentru a crea una noua.
        </p>
      </div>
    </div>
  );
}
