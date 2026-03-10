"use client";

/**
 * MinimalBaptism2 — "Nor"
 * Palette: blush pink (#FDF0F0), white, warm gray text, light pink accents
 * Fonts: Quicksand (headings) + Inter (body)
 * Layout: vertical card, square-cropped top photo, ribbon-like CSS divider
 */

import { Quicksand, Inter } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

/** CSS ribbon-style divider */
function RibbonDivider() {
  return (
    <div className="flex items-center w-full gap-2" aria-hidden="true">
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: "#F5C6C6" }}
      />
      <div
        className="w-2 h-2 rotate-45"
        style={{ backgroundColor: "#F5C6C6" }}
      />
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: "#F5C6C6" }}
      />
    </div>
  );
}

export default function MinimalBaptism2(props: InvitationFields) {
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
      className="min-h-screen w-full flex flex-col items-center justify-center py-12 px-4"
      style={{ backgroundColor: "#FDF0F0" }}
    >
      {/* Vertical card */}
      <div
        className="w-full max-w-xs flex flex-col items-center text-center overflow-hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 2px 16px rgba(200, 100, 100, 0.08)",
        }}
      >
        {/* Square photo top */}
        <div
          className="relative w-full shrink-0 overflow-hidden"
          style={{ aspectRatio: "1/1" }}
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
              style={{ backgroundColor: "#FAD9D9", minHeight: "200px" }}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-5 px-7 py-8 w-full">
          {/* Child name */}
          <h1
            className={`${quicksand.className} text-3xl font-bold leading-tight`}
            style={{ color: "#C46A6A" }}
          >
            {names}
          </h1>

          <RibbonDivider />

          {/* Date */}
          <div className={`${inter.className} flex flex-col gap-1`}>
            <p className="text-sm font-light" style={{ color: "#C46A6A" }}>
              {formattedDate}
            </p>
            <p className="text-xs font-light" style={{ color: "#999" }}>
              {formattedTime}
            </p>
          </div>

          {/* Venue */}
          <div className={`${inter.className} flex flex-col gap-1`}>
            <p className="text-sm font-normal" style={{ color: "#333" }}>
              {venueName}
            </p>
            <p className="text-xs font-light" style={{ color: "#888" }}>
              {venueAddress}
            </p>
          </div>

          {/* Personal message */}
          {personalMessage && (
            <>
              <RibbonDivider />
              <p
                className={`${quicksand.className} text-sm font-light italic leading-relaxed`}
                style={{ color: "#666" }}
              >
                {personalMessage}
              </p>
            </>
          )}

          {/* Dress code */}
          {dresscodeRsvpNote && (
            <p
              className={`${inter.className} text-xs tracking-widest uppercase`}
              style={{ color: "#D4A0A0" }}
            >
              {dresscodeRsvpNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
