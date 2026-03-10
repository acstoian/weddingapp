"use client";

/**
 * MinimalWedding3 — "Briza"
 * Palette: pure white (#FFFFFF), muted sage (#A8BEA8), dark navy text (#1A2036)
 * Fonts: EB Garamond (headings) + Inter (body)
 * Layout: top panoramic photo strip (21:9), names large, minimal grid layout
 */

import { EB_Garamond, Inter } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export default function MinimalWedding3(props: InvitationFields) {
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
      className="min-h-screen w-full flex flex-col"
      style={{ backgroundColor: "#FFFFFF", color: "#1A2036" }}
    >
      {/* Panoramic photo strip — 21:9 crop */}
      <div
        className="w-full relative overflow-hidden"
        style={{ aspectRatio: "21/9", maxHeight: "40vh" }}
      >
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt={`${names} - cover photo`}
            fill
            className="object-cover"
            style={{ objectFit: "cover", objectPosition: "center 40%" }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: "#E4EBE4", minHeight: "180px" }}
          />
        )}
      </div>

      {/* Content grid */}
      <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Names */}
        <h1
          className={`${ebGaramond.className} text-5xl sm:text-6xl font-normal leading-none tracking-tight`}
          style={{ color: "#1A2036" }}
        >
          {names}
        </h1>

        {/* Date / Venue grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className={`${inter.className} flex flex-col gap-1`}>
            <p
              className="text-xs uppercase tracking-widest font-light"
              style={{ color: "#A8BEA8" }}
            >
              Data
            </p>
            <p className="text-base font-light" style={{ color: "#1A2036" }}>
              {formattedDate}
            </p>
            <p className="text-sm font-light" style={{ color: "#5A6070" }}>
              {formattedTime}
            </p>
          </div>

          <div className={`${inter.className} flex flex-col gap-1`}>
            <p
              className="text-xs uppercase tracking-widest font-light"
              style={{ color: "#A8BEA8" }}
            >
              Locatie
            </p>
            <p className="text-base font-light" style={{ color: "#1A2036" }}>
              {venueName}
            </p>
            <p className="text-sm font-light" style={{ color: "#5A6070" }}>
              {venueAddress}
            </p>
          </div>
        </div>

        {/* Sage divider */}
        <div className="w-full h-px" style={{ backgroundColor: "#A8BEA8" }} />

        {/* Personal message */}
        {personalMessage && (
          <p
            className={`${ebGaramond.className} text-xl sm:text-2xl italic font-normal leading-relaxed`}
            style={{ color: "#3A4050" }}
          >
            {personalMessage}
          </p>
        )}

        {/* Dress code */}
        {dresscodeRsvpNote && (
          <p
            className={`${inter.className} text-xs tracking-widest uppercase font-light`}
            style={{ color: "#A8BEA8" }}
          >
            {dresscodeRsvpNote}
          </p>
        )}
      </div>
    </div>
  );
}
