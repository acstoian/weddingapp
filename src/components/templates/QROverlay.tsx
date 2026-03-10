"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

function QROverlayInner() {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "true";
  if (!isPrint) return null;

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "8px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "white",
        borderRadius: "6px",
        padding: "6px",
        display: "inline-flex",
        zIndex: 10,
      }}
    >
      <QRCodeSVG
        value={url || "https://placeholder.local"}
        size={170}
        level="M"
        bgColor="#ffffff"
        fgColor="#000000"
        marginSize={0}
      />
    </div>
  );
}

export function QROverlay() {
  return (
    <Suspense fallback={null}>
      <QROverlayInner />
    </Suspense>
  );
}
