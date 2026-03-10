"use client";

/**
 * DecorativeWedding1 — "Botanica"
 * Palette: warm ivory (#FBF7EF), gold (#B8962E), deep green (#2D4A3E), rich text
 * Fonts: Great Vibes (script names) + Cormorant Garamond (body) + Lato (labels)
 * Layout: botanical SVG corner decoration, center-stack, gold dividers
 */

import { Great_Vibes, Cormorant_Garamond, Lato } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";
import { QROverlay } from "./QROverlay";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

/** Simple inline botanical leaf cluster for corner decorations */
function BotanicalCorner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 60"
      width="60"
      height="60"
      aria-hidden="true"
      className={className}
    >
      {/* Stem */}
      <path
        d="M30 55 Q28 38 20 25"
        fill="none"
        stroke="#2D4A3E"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M30 55 Q32 38 40 25"
        fill="none"
        stroke="#2D4A3E"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Left leaf */}
      <ellipse
        cx="16"
        cy="22"
        rx="9"
        ry="5"
        fill="#4A7C59"
        opacity="0.75"
        transform="rotate(-30 16 22)"
      />
      {/* Right leaf */}
      <ellipse
        cx="44"
        cy="22"
        rx="9"
        ry="5"
        fill="#4A7C59"
        opacity="0.75"
        transform="rotate(30 44 22)"
      />
      {/* Top leaf */}
      <ellipse
        cx="30"
        cy="14"
        rx="7"
        ry="4"
        fill="#2D4A3E"
        opacity="0.85"
        transform="rotate(-5 30 14)"
      />
      {/* Small berry clusters */}
      <circle cx="22" cy="18" r="2" fill="#B8962E" opacity="0.8" />
      <circle cx="38" cy="18" r="2" fill="#B8962E" opacity="0.8" />
      <circle cx="30" cy="8" r="2.5" fill="#B8962E" opacity="0.9" />
    </svg>
  );
}

export default function DecorativeWedding1(props: InvitationFields) {
  const {
    names,
    eventDatetime,
    venueName,
    venueAddress,
    coverPhotoUrl,
    personalMessage,
    dresscodeRsvpNote,
  } = props;

  const eventDate = eventDatetime ? new Date(eventDatetime) : null;
  const isValidDate = eventDate && !isNaN(eventDate.getTime());
  const formattedDate = isValidDate ? format(eventDate!, "d MMMM yyyy", { locale: ro }) : "";
  const formattedTime = isValidDate ? format(eventDate!, "HH:mm") : "";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{ backgroundColor: "#FBF7EF", color: "#2C2010" }}
    >
      {/* Cover photo */}
      {coverPhotoUrl && (
        <div
          className="w-full relative"
          style={{ aspectRatio: "4/3", maxHeight: "50vh" }}
        >
          <Image
            src={coverPhotoUrl}
            alt={`${names} - cover photo`}
            fill
            className="object-cover"
            style={{ objectFit: "cover" }}
          />
          <QROverlay />
        </div>
      )}

      {/* Decorated content card */}
      <div className="relative w-full max-w-lg mx-auto px-8 pt-10 pb-12 flex flex-col items-center text-center gap-6">
        {/* Corner decorations */}
        <BotanicalCorner className="absolute top-2 left-2 rotate-0" />
        <BotanicalCorner className="absolute top-2 right-2 rotate-90" />
        <BotanicalCorner className="absolute bottom-2 left-2 -rotate-90" />
        <BotanicalCorner className="absolute bottom-2 right-2 rotate-180" />

        {/* Border frame */}
        <div
          className="absolute inset-6 pointer-events-none"
          style={{
            border: "1.5px solid #B8962E",
            opacity: 0.5,
          }}
        />

        {/* Names in script */}
        <h1
          className={`${greatVibes.className} text-5xl sm:text-6xl leading-tight mt-8`}
          style={{ color: "#2C2010" }}
        >
          {names}
        </h1>

        {/* Gold divider */}
        <div
          className="flex items-center gap-3 w-full justify-center"
          aria-hidden="true"
        >
          <div className="flex-1 h-px max-w-[60px]" style={{ backgroundColor: "#B8962E" }} />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#B8962E" }}
          />
          <div className="flex-1 h-px max-w-[60px]" style={{ backgroundColor: "#B8962E" }} />
        </div>

        {/* Date */}
        <div className={`${cormorant.className} flex flex-col gap-1`}>
          <p
            className="text-lg font-light tracking-wide"
            style={{ color: "#2D4A3E" }}
          >
            {formattedDate}
          </p>
          <p className="text-base font-light" style={{ color: "#6B5A30" }}>
            {formattedTime}
          </p>
        </div>

        {/* Venue */}
        <div className={`${cormorant.className} flex flex-col gap-1`}>
          <p className="text-lg font-normal" style={{ color: "#2C2010" }}>
            {venueName}
          </p>
          <p className="text-base font-light" style={{ color: "#6B5A30" }}>
            {venueAddress}
          </p>
        </div>

        {/* Gold divider */}
        <div
          className="flex items-center gap-3 w-full justify-center"
          aria-hidden="true"
        >
          <div className="flex-1 h-px max-w-[60px]" style={{ backgroundColor: "#B8962E" }} />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#B8962E" }}
          />
          <div className="flex-1 h-px max-w-[60px]" style={{ backgroundColor: "#B8962E" }} />
        </div>

        {/* Personal message */}
        {personalMessage && (
          <p
            className={`${cormorant.className} text-lg italic font-light leading-relaxed max-w-sm`}
            style={{ color: "#4A3A20" }}
          >
            {personalMessage}
          </p>
        )}

        {/* Dress code */}
        {dresscodeRsvpNote && (
          <p
            className={`${lato.className} text-xs tracking-widest uppercase mb-8`}
            style={{ color: "#B8962E" }}
          >
            {dresscodeRsvpNote}
          </p>
        )}
      </div>
    </div>
  );
}
