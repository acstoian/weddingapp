"use client";

/**
 * MinimalBaptism1 — "Zefir"
 * Palette: soft sky blue (#EBF4FA), white, light gray text (#666)
 * Fonts: Nunito (headings) + Lato (body)
 * Layout: rounded card, circle-cropped photo, centered soft cloud-like feel
 */

import { Nunito, Lato } from "next/font/google";
import Image from "next/image";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { InvitationFields } from "@/lib/templates/schema";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export default function MinimalBaptism1(props: InvitationFields) {
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
      style={{ backgroundColor: "#EBF4FA" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm flex flex-col items-center text-center gap-6 px-8 py-10"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          boxShadow:
            "0 4px 24px rgba(100, 160, 200, 0.12), 0 1px 4px rgba(100, 160, 200, 0.08)",
        }}
      >
        {/* Circle cover photo */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: "3px solid #EBF4FA",
          }}
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
              style={{ backgroundColor: "#C8E6F5" }}
            />
          )}
        </div>

        {/* Child name */}
        <h1
          className={`${nunito.className} text-3xl sm:text-4xl font-semibold leading-tight`}
          style={{ color: "#2A5F80" }}
        >
          {names}
        </h1>

        {/* Light divider */}
        <div
          className="w-10 h-px"
          style={{ backgroundColor: "#B0D8EF" }}
        />

        {/* Date */}
        <div className={`${lato.className} flex flex-col gap-1`}>
          <p className="text-sm font-light" style={{ color: "#4A9CC4" }}>
            {formattedDate}
          </p>
          <p className="text-sm font-light" style={{ color: "#888" }}>
            {formattedTime}
          </p>
        </div>

        {/* Venue */}
        <div className={`${lato.className} flex flex-col gap-1`}>
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
            <div className="w-10 h-px" style={{ backgroundColor: "#B0D8EF" }} />
            <p
              className={`${nunito.className} text-sm font-light italic leading-relaxed`}
              style={{ color: "#555" }}
            >
              {personalMessage}
            </p>
          </>
        )}

        {/* Dress code */}
        {dresscodeRsvpNote && (
          <p
            className={`${lato.className} text-xs tracking-widest uppercase`}
            style={{ color: "#4A9CC4" }}
          >
            {dresscodeRsvpNote}
          </p>
        )}
      </div>
    </div>
  );
}
