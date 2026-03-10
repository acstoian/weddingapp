"use client";

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import type { AutosaveStatus } from "./useAutosave";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
}

export default function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  const [visible, setVisible] = useState<AutosaveStatus>(status);

  useEffect(() => {
    setVisible(status);

    if (status === "saved") {
      const timer = setTimeout(() => setVisible("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (visible === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {visible === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[#831843]" />
          <span className="text-[#831843]">Se salveaza…</span>
        </>
      )}
      {visible === "saved" && (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Salvat</span>
        </>
      )}
    </div>
  );
}
