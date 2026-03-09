"use client";

/**
 * MinimalWedding1 — "Luminos"
 * Palette: off-white (#FAFAF8), deep charcoal (#2C2C2C), sage accent (#7C9E87)
 * Fonts: Cormorant Garamond (headings) + Lato (body)
 * Layout: centered vertical stack, full-width hero, elegant dividers
 */

import { Cormorant_Garamond, Lato } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";

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

export default function MinimalWedding1(props: InvitationFields) {
  const {
    names,
    eventDatetime,
    venueName,
    venueAddress,
    coverPhotoUrl,
    personalMessage,
    dresscodeRsvpNote,
  } = props;

  const eventDate = new Date(eventDatetime);
  const formattedDate = format(eventDate, "d MMMM yyyy", { locale: ro });
  const formattedTime = format(eventDate, "HH:mm");

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{ backgroundColor: "#FAFAF8", color: "#2C2C2C" }}
    >
      {/* Hero cover photo */}
      <div className="w-full relative" style={{ aspectRatio: "16/9", maxHeight: "60vh" }}>
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt={`${names} - cover photo`}
            fill
            className="object-cover"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: "#E8EDE9", minHeight: "40vh" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-xl px-6 py-12 flex flex-col items-center text-center gap-8">
        {/* Names */}
        <h1
          className={`${cormorant.className} text-4xl sm:text-5xl font-light leading-tight`}
          style={{ color: "#2C2C2C" }}
        >
          {names}
        </h1>

        {/* Sage divider */}
        <div className="w-16 h-px" style={{ backgroundColor: "#7C9E87" }} />

        {/* Date & time */}
        <div className={`${lato.className} flex flex-col gap-1`}>
          <p className="text-base tracking-widest uppercase text-sm" style={{ color: "#7C9E87" }}>
            {formattedDate}
          </p>
          <p className="text-sm" style={{ color: "#6B6B6B" }}>
            {formattedTime}
          </p>
        </div>

        {/* Venue */}
        <div className={`${lato.className} flex flex-col gap-1`}>
          <p className="font-light text-base" style={{ color: "#2C2C2C" }}>
            {venueName}
          </p>
          <p className="text-sm font-light" style={{ color: "#6B6B6B" }}>
            {venueAddress}
          </p>
        </div>

        {/* Sage divider */}
        <div className="w-16 h-px" style={{ backgroundColor: "#7C9E87" }} />

        {/* Personal message */}
        {personalMessage && (
          <p
            className={`${cormorant.className} text-lg sm:text-xl italic font-light max-w-sm leading-relaxed`}
            style={{ color: "#4A4A4A" }}
          >
            {personalMessage}
          </p>
        )}

        {/* Dress code */}
        {dresscodeRsvpNote && (
          <p
            className={`${lato.className} text-xs tracking-widest uppercase`}
            style={{ color: "#7C9E87" }}
          >
            {dresscodeRsvpNote}
          </p>
        )}
      </div>
    </div>
  );
}
