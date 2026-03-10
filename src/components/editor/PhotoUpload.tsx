"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface PhotoUploadProps {
  invitationId: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}

export default function PhotoUpload({
  invitationId,
  value,
  onChange,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Tip de fisier neacceptat. Folositi JPEG, PNG sau WebP.");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("Fisierul este prea mare (max 5MB)");
        return;
      }

      setIsUploading(true);
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress during upload
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 15, 85));
        }, 200);

        const res = await fetch(
          `/api/upload?invitationId=${encodeURIComponent(invitationId)}`,
          { method: "POST", body: formData }
        );

        clearInterval(progressInterval);
        setProgress(100);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload esuat");
        }

        const { url } = await res.json();
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload esuat");
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [invitationId, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, isUploading]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="space-y-2">
      {value ? (
        // Show thumbnail + clear button
        <div className="relative rounded-xl overflow-hidden border border-[#FBCFE8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Poza de copertă"
            className="w-full h-40 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-lg p-1.5 cursor-pointer transition-colors duration-150 border border-[#FBCFE8]"
            aria-label="Sterge poza"
          >
            <X className="h-4 w-4 text-[#831843]" />
          </button>
          <span className="absolute bottom-2 left-2 text-xs text-white bg-black/40 rounded px-2 py-0.5">
            Sterge poza
          </span>
        </div>
      ) : (
        // Drag-drop zone
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={[
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors duration-150",
            isDragging
              ? "border-[#DB2777] bg-[#FDF2F8]"
              : "border-[#FBCFE8] hover:border-[#F472B6] hover:bg-[#FDF2F8]",
            isUploading ? "cursor-not-allowed opacity-60" : "",
          ].join(" ")}
        >
          <ImageIcon className="h-8 w-8 text-[#F472B6]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[#831843]">
              {isDragging ? "Elibereaza fisierul" : "Trage poza sau apasa"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP — max 5MB</p>
          </div>

          {isUploading && (
            <div className="absolute inset-x-4 bottom-3">
              <div className="h-1.5 bg-[#FBCFE8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#DB2777] transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>
      )}
    </div>
  );
}
