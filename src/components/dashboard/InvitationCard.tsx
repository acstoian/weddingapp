"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Edit2, Copy, Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline AlertDialog (no shadcn installed yet — thin wrapper over native confirm)
// We keep this as a controlled state to avoid native confirm blocking the UI thread
function DeleteDialog({
  open,
  onCancel,
  onConfirm,
  title,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Sterge invitatia
        </h3>
        <p className="mb-6 text-sm text-gray-600">
          Esti sigur ca vrei sa stergi &ldquo;{title || "Fara titlu"}&rdquo;?
          Aceasta actiune nu poate fi anulata.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Anuleaza
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Sterge
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Status badge -----------------------------------------------------------

const STATUS_STYLES: Record<
  string,
  { label: string; classes: string }
> = {
  DRAFT: {
    label: "Ciorna",
    classes: "bg-gray-100 text-gray-600",
  },
  PUBLISHING: {
    label: "Se publica...",
    classes: "bg-amber-100 text-amber-700",
  },
  LIVE: {
    label: "Live",
    classes: "bg-green-100 text-green-700",
  },
  FAILED: {
    label: "Eroare",
    classes: "bg-red-100 text-red-600",
  },
};

// ---- Types ------------------------------------------------------------------

export interface InvitationRow {
  id: string;
  templateId: string;
  title: string;
  status: "DRAFT" | "PUBLISHING" | "LIVE" | "FAILED";
  liveUrl: string | null;
  updatedAt: string | Date;
  thumbnailUrl?: string;
}

type InvitationCardProps =
  | { type: "new" }
  | { type?: undefined; invitation: InvitationRow };

// ---- Component --------------------------------------------------------------

export default function InvitationCard(props: InvitationCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // "+ New" card
  if (props.type === "new") {
    return (
      <Link
        href="/gallery"
        className={cn(
          "group flex min-h-[280px] cursor-pointer flex-col items-center justify-center",
          "rounded-2xl border-2 border-dashed border-[#FBCFE8] bg-white",
          "transition-all duration-200 hover:border-[#DB2777] hover:shadow-md",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DB2777] focus-visible:ring-offset-2"
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 transition-colors group-hover:bg-pink-100">
          <Plus className="h-6 w-6 text-[#DB2777]" />
        </div>
        <span className="text-sm font-semibold text-[#DB2777]">
          Invitatie noua
        </span>
      </Link>
    );
  }

  const { invitation } = props;
  const statusStyle = STATUS_STYLES[invitation.status] ?? STATUS_STYLES.DRAFT;
  const displayTitle = invitation.title || "Fara titlu";
  const formattedDate = format(
    new Date(invitation.updatedAt),
    "d MMM yyyy, HH:mm",
    { locale: ro }
  );

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/invitations/${invitation.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleCopyUrl() {
    if (!invitation.liveUrl) return;
    await navigator.clipboard.writeText(invitation.liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DeleteDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={displayTitle}
      />

      <div
        className={cn(
          "group relative flex cursor-pointer flex-col overflow-hidden",
          "rounded-2xl border border-[#FBCFE8] bg-white shadow-sm",
          "transition-shadow duration-200 hover:shadow-md"
        )}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100">
          {invitation.thumbnailUrl ? (
            <Image
              src={invitation.thumbnailUrl}
              alt={`${displayTitle} preview`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-['Playfair_Display',_serif] text-lg text-[#831843]/40">
                {displayTitle}
              </span>
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
            <Link
              href={`/editor/${invitation.id}`}
              onClick={(e) => e.stopPropagation()}
              aria-label="Editeaza invitatia"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-colors hover:bg-white hover:text-[#DB2777]"
            >
              <Edit2 className="h-4 w-4" />
            </Link>

            {invitation.status === "LIVE" && invitation.liveUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl();
                }}
                aria-label="Copiaza link-ul"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-colors hover:bg-white hover:text-[#DB2777]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              aria-label="Sterge invitatia"
              disabled={isDeleting}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-colors hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card footer */}
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold text-[#831843]">
              {displayTitle}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusStyle.classes
              )}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="text-xs text-gray-400">Editat {formattedDate}</p>
        </div>
      </div>
    </>
  );
}
