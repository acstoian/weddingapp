"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";

type PublishStage = "preparing" | "building" | "live" | "error";

interface PublishProgressProps {
  invitationId: string;
  deploymentId: string | null;
  onRetry: () => void;
}

const STAGE_LABELS: Record<PublishStage, string> = {
  preparing: "Se pregateste…",
  building: "Se construieste site-ul…",
  live: "Live!",
  error: "Eroare la publicare",
};

export default function PublishProgress({
  invitationId,
  deploymentId,
  onRetry,
}: PublishProgressProps) {
  const [stage, setStage] = useState<PublishStage>("preparing");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deploymentId) return;

    // "error" is a sentinel set by PublishButton when the POST itself failed.
    // Show error immediately — don't open an SSE connection.
    if (deploymentId === "error") {
      setStage("error");
      setErrorMessage("Eroare la publicare. Incearca din nou.");
      return;
    }

    const source = new EventSource(
      `/api/deploy-status/${deploymentId}?invitationId=${invitationId}`
    );

    source.addEventListener("status", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { status: string; url?: string; error?: string };

      if (data.status === "QUEUED") {
        setStage("preparing");
      } else if (data.status === "BUILDING") {
        setStage("building");
      } else if (data.status === "READY") {
        setStage("live");
        setLiveUrl(data.url ?? null);
        source.close();
      } else if (data.status === "ERROR") {
        setStage("error");
        setErrorMessage(data.error ?? "Eroare necunoscuta");
        source.close();
      }
    });

    source.onerror = () => {
      setStage("error");
      setErrorMessage("Conexiunea cu serverul a picat. Incearca din nou.");
      source.close();
    };

    return () => source.close();
  }, [deploymentId, invitationId]);

  const handleCopy = async () => {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (stage === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
        <button
          onClick={onRetry}
          className="text-sm text-[#DB2777] hover:text-[#831843] font-medium cursor-pointer transition-colors duration-150"
        >
          Incearca din nou
        </button>
      </div>
    );
  }

  if (stage === "live" && liveUrl) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-semibold">Invitatia ta este live!</p>
        </div>
        <p className="text-xs text-gray-500 break-all">{liveUrl}</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-[#FBCFE8] bg-white px-3 py-1.5 text-xs font-medium text-[#831843] hover:bg-[#FDF2F8] cursor-pointer transition-colors duration-150"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copiat!" : "Copiaza"}
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#FBCFE8] bg-white px-3 py-1.5 text-xs font-medium text-[#831843] hover:bg-[#FDF2F8] transition-colors duration-150"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Deschide
          </a>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-[#DB2777] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#831843] transition-colors duration-150"
          >
            Inapoi la dashboard
          </a>
        </div>
      </div>
    );
  }

  // preparing or building
  const progressPercent = stage === "preparing" ? 33 : 66;

  return (
    <div className="rounded-xl border border-[#FBCFE8] bg-[#FDF2F8] p-4 space-y-3">
      <p className="text-sm font-medium text-[#831843]">{STAGE_LABELS[stage]}</p>
      <div className="h-1.5 bg-[#FBCFE8] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#DB2777] transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
