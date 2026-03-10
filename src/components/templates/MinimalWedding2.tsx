"use client";

/**
 * MinimalWedding2 — "Seren"
 * Palette: cream (#FDF6EC), dusty rose (#C9807A), near-black text (#1A1A1A)
 * Fonts: Playfair Display (headings) + Source Sans 3 (body)
 * Layout: split hero — photo left 40%, content right 60% on desktop; stacked on mobile
 */

import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";
import { QROverlay } from "./QROverlay";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export default function MinimalWedding2(props: InvitationFields) {
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
      className="min-h-screen w-full flex flex-col md:flex-row"
      style={{ backgroundColor: "#FDF6EC", color: "#1A1A1A" }}
    >
      {/* Photo — left 40% on desktop, full width on mobile */}
      <div
        className="relative w-full md:w-2/5 shrink-0"
        style={{ minHeight: "300px" }}
      >
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
            style={{ backgroundColor: "#F0E4D8", minHeight: "300px" }}
          />
        )}
        <QROverlay />
      </div>

      {/* Content — right 60% on desktop */}
      <div className="flex-1 flex flex-col justify-center items-start px-8 sm:px-12 py-14 gap-6">
        <h1
          className={`${playfair.className} text-4xl sm:text-5xl font-normal leading-tight`}
        >
          {names}
        </h1>

        <div className="w-12 h-px" style={{ backgroundColor: "#C9807A" }} />

        <div className={`${sourceSans.className} flex flex-col gap-1`}>
          <p
            className="text-base font-light tracking-wide"
            style={{ color: "#C9807A" }}
          >
            {formattedDate} &middot; {formattedTime}
          </p>
        </div>

        <div className={`${sourceSans.className} flex flex-col gap-1`}>
          <p className="font-normal text-base">{venueName}</p>
          <p className="font-light text-sm" style={{ color: "#5A5A5A" }}>
            {venueAddress}
          </p>
        </div>

        {personalMessage && (
          <p
            className={`${playfair.className} text-base italic font-normal leading-relaxed max-w-sm`}
            style={{ color: "#4A4A4A" }}
          >
            {personalMessage}
          </p>
        )}

        {dresscodeRsvpNote && (
          <p
            className={`${sourceSans.className} text-xs tracking-widest uppercase`}
            style={{ color: "#C9807A" }}
          >
            {dresscodeRsvpNote}
          </p>
        )}
      </div>
    </div>
  );
}
