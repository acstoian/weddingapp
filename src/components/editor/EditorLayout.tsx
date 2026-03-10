"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { InvitationFields } from "@/lib/templates/schema";
import type { TemplateDefinition } from "@/lib/templates/registry";
import FieldSidebar from "./FieldSidebar";
import LivePreview from "./LivePreview";
import PublishButton from "./PublishButton";
import { useAutosave, type AutosaveStatus } from "./useAutosave";

interface SerializedInvitation {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  fields: InvitationFields;
  status: string;
  vercelProjectId: string | null;
  vercelDeployId: string | null;
  liveUrl: string | null;
  lastPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditorLayoutProps {
  invitation: SerializedInvitation;
  templateDef: TemplateDefinition;
}

type MobileTab = "edit" | "preview";

export default function EditorLayout({
  invitation,
  templateDef,
}: EditorLayoutProps) {
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");

  const form = useForm<InvitationFields>({
    defaultValues: invitation.fields,
  });

  const watchedFields = form.watch();

  useAutosave(invitation.id, watchedFields, setAutosaveStatus);

  // Load Google Fonts for this template
  useEffect(() => {
    if (!templateDef.googleFonts || templateDef.googleFonts.length === 0) return;

    const fontFamilies = templateDef.googleFonts
      .map((f) => f.replace(/ /g, "+") + ":wght@400;500;600;700")
      .join("&family=");

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [templateDef.googleFonts]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#FDF2F8]">
      {/* ─── Mobile tab bar (hidden on desktop) ─── */}
      <div className="lg:hidden flex-shrink-0 bg-white border-b border-[#FBCFE8] flex">
        <button
          type="button"
          onClick={() => setMobileTab("edit")}
          className={[
            "flex-1 py-3 text-sm font-semibold cursor-pointer transition-colors duration-150",
            mobileTab === "edit"
              ? "text-[#DB2777] border-b-2 border-[#DB2777]"
              : "text-gray-400 hover:text-[#831843]",
          ].join(" ")}
        >
          Editeaza
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={[
            "flex-1 py-3 text-sm font-semibold cursor-pointer transition-colors duration-150",
            mobileTab === "preview"
              ? "text-[#DB2777] border-b-2 border-[#DB2777]"
              : "text-gray-400 hover:text-[#831843]",
          ].join(" ")}
        >
          Previzualizeaza
        </button>
      </div>

      {/* ─── Main content: sidebar + preview ─── */}
      <div className="flex flex-1 min-h-0">
        {/* ─── Sidebar ─── */}
        {/* Desktop: always visible at 380px. Mobile: full-width when edit tab, hidden when preview. */}
        <aside
          className={[
            "bg-white border-r border-[#FBCFE8] flex flex-col min-h-0",
            "lg:w-[380px] lg:flex-shrink-0 lg:flex",
            mobileTab === "preview" ? "hidden lg:flex" : "flex flex-1 lg:flex-initial lg:flex-none",
          ].join(" ")}
        >
          {/* Sidebar header */}
          <div className="flex-shrink-0 px-5 py-4 border-b border-[#FBCFE8]">
            <h1 className="font-['Playfair_Display',_serif] text-lg font-semibold text-[#831843] truncate">
              {invitation.title || "Invitatie noua"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{templateDef.name}</p>
          </div>

          {/* Single FieldSidebar instance — no duplicate registrations */}
          <div className="flex-1 overflow-hidden min-h-0">
            <FieldSidebar
              form={form}
              templateId={invitation.templateId}
              invitationId={invitation.id}
              autosaveStatus={autosaveStatus}
            />
          </div>
        </aside>

        {/* ─── Live preview ─── */}
        {/* Desktop: always visible. Mobile: full-width when preview tab, hidden when edit. */}
        <main
          className={[
            "flex-1 min-h-0 overflow-hidden",
            mobileTab === "edit" ? "hidden lg:block" : "block",
          ].join(" ")}
        >
          <LivePreview templateId={invitation.templateId} fields={watchedFields} />
        </main>
      </div>

      {/* ─── Mobile sticky Publish button (hidden on desktop — sidebar has its own) ─── */}
      <div className="lg:hidden flex-shrink-0 bg-white border-t border-[#FBCFE8] px-4 py-3">
        <PublishButton invitationId={invitation.id} />
      </div>
    </div>
  );
}
