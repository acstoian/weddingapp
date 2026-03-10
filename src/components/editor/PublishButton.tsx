"use client";

import { useState } from "react";
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
import PublishProgress from "./PublishProgress";

interface PublishButtonProps {
  invitationId: string;
  onPublished?: () => void;
}

export default function PublishButton({ invitationId, onPublished }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const handlePublish = async () => {
    setIsPublishing(true);
    setDeploymentId(null);

    try {
      const res = await fetch(`/api/publish/${invitationId}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeploymentId(data.deploymentId ?? "pending");
      } else {
        // Will show error in PublishProgress — set a sentinel value
        setDeploymentId("error");
      }
    } catch {
      setDeploymentId("error");
    }
  };

  const handleRetry = () => {
    setIsPublishing(false);
    setDeploymentId(null);
  };

  if (isPublishing) {
    return (
      <PublishProgress
        invitationId={invitationId}
        deploymentId={deploymentId}
        onRetry={handleRetry}
        onPublished={onPublished}
      />
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="w-full rounded-xl bg-[#DB2777] py-3 text-sm font-semibold text-white hover:bg-[#831843] cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#DB2777] focus:ring-offset-2"
        >
          Publica
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-['Playfair_Display',_serif] text-[#831843]">
            Publicati invitatia?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Aceasta creeaza un site live. Il puteti actualiza sau sterge
            oricand.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Renunta</AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePublish}
            className="bg-[#DB2777] hover:bg-[#831843] cursor-pointer"
          >
            Publica
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
