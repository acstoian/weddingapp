"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UseFormReturn } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PhotoUpload from "./PhotoUpload";
import AutosaveIndicator from "./AutosaveIndicator";
import PublishButton from "./PublishButton";
import { PdfExportButton } from "./EditorLockedFeatures";
import type { InvitationFields } from "@/lib/templates/schema";
import type { AutosaveStatus } from "./useAutosave";
import type { Tier } from "@/lib/feature-gate";

interface FieldSidebarProps {
  form: UseFormReturn<InvitationFields>;
  templateId: string;
  invitationId: string;
  autosaveStatus: AutosaveStatus;
  tier: Tier;
  isLive: boolean;
  onPublished: () => void;
}

function isWeddingTemplate(templateId: string): boolean {
  return templateId.includes("wedding");
}

const inputClass =
  "w-full rounded-xl border border-[#FBCFE8] bg-white px-3 py-2.5 text-sm text-[#831843] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DB2777] focus:border-transparent transition-colors duration-150";

const labelClass = "block text-xs font-semibold text-[#831843] uppercase tracking-wide mb-1.5";

export default function FieldSidebar({
  form,
  templateId,
  invitationId,
  autosaveStatus,
  tier,
  isLive,
  onPublished,
}: FieldSidebarProps) {
  const router = useRouter();
  const { register, watch, setValue, formState: { errors } } = form;
  const [personalMessageLen, setPersonalMessageLen] = useState(
    (watch("personalMessage") ?? "").length
  );

  const isWedding = isWeddingTemplate(templateId);
  const coverPhotoUrl = watch("coverPhotoUrl");

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable fields area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Field 1: Title */}
        <div>
          <label className={labelClass}>Titlu invitatie</label>
          <input
            type="text"
            placeholder="ex. Nunta Ana & Ion"
            className={inputClass}
            {...register("title", { required: "Titlul este obligatoriu" })}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Field 2: Names */}
        <div>
          <label className={labelClass}>
            {isWedding ? "Numele mirilor" : "Numele copilului"}
          </label>
          <input
            type="text"
            placeholder={isWedding ? "ex. Ana & Ion Popescu" : "ex. Maria"}
            className={inputClass}
            {...register("names", { required: "Numele este obligatoriu" })}
          />
          {errors.names && (
            <p className="mt-1 text-xs text-red-500">{errors.names.message}</p>
          )}
        </div>

        {/* Field 3: Date/time */}
        <div>
          <label className={labelClass}>Data evenimentului</label>
          <input
            type="datetime-local"
            className={inputClass}
            {...register("eventDatetime")}
          />
        </div>

        {/* Field 4: Location */}
        <div>
          <label className={labelClass}>Locatia</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Sala / Locatie"
              className={inputClass}
              {...register("venueName")}
            />
            <input
              type="text"
              placeholder="Adresa completa"
              className={inputClass}
              {...register("venueAddress")}
            />
          </div>
        </div>

        {/* Field 5: Cover photo */}
        <div>
          <label className={labelClass}>Poza de copertă</label>
          <PhotoUpload
            invitationId={invitationId}
            value={coverPhotoUrl}
            onChange={(url) => setValue("coverPhotoUrl", url, { shouldDirty: true })}
          />
        </div>

        {/* Field 6: Personal message */}
        <div>
          <label className={labelClass}>
            Mesaj personal{" "}
            <span className="text-gray-400 font-normal normal-case">
              (optional)
            </span>
          </label>
          <textarea
            placeholder="Un mesaj pentru invitati…"
            rows={4}
            maxLength={500}
            className={`${inputClass} resize-none`}
            {...register("personalMessage", {
              maxLength: { value: 500, message: "Maxim 500 caractere" },
              onChange: (e) => setPersonalMessageLen(e.target.value.length),
            })}
          />
          <div className="flex justify-between mt-1">
            {errors.personalMessage && (
              <p className="text-xs text-red-500">{errors.personalMessage.message}</p>
            )}
            <p className="text-xs text-gray-400 ml-auto">
              {personalMessageLen}/500
            </p>
          </div>
        </div>

        {/* Field 7: Dress code / RSVP */}
        <div>
          <label className={labelClass}>
            Dress code / RSVP{" "}
            <span className="text-gray-400 font-normal normal-case">
              (optional)
            </span>
          </label>
          <textarea
            placeholder="ex. Tinuta eleganta, RSVP pana pe 1 Mai…"
            rows={3}
            className={`${inputClass} resize-none`}
            {...register("dresscodeRsvpNote")}
          />
        </div>

        {/* Template switch link */}
        <div className="pt-2 border-t border-[#FBCFE8]">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-[#831843] hover:text-[#DB2777] cursor-pointer transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                Alege alt sablon
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-['Playfair_Display',_serif] text-[#831843]">
                  Schimbi sablonul?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Datele introduse (text, date, locatie) se pastreaza. Doar aspectul
                  vizual se va schimba conform noului sablon ales.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Renunta</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => router.push("/gallery")}
                  className="cursor-pointer"
                >
                  Mergi la galerie
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Sticky bottom: autosave + publish + PDF export */}
      <div className="border-t border-[#FBCFE8] bg-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <AutosaveIndicator status={autosaveStatus} />
        </div>
        <PublishButton invitationId={invitationId} onPublished={onPublished} />
        <PdfExportButton
          tier={tier}
          invitationId={invitationId}
          isLive={isLive}
        />
      </div>
    </div>
  );
}
