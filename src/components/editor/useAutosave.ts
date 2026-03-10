"use client";

import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import type { InvitationFields } from "@/lib/templates/schema";

export type AutosaveStatus = "idle" | "saving" | "saved";

/**
 * useAutosave — debounces invitation field changes and fires a PATCH request
 * to /api/invitations/:id after 2 seconds of inactivity.
 *
 * @param invitationId - The invitation's UUID
 * @param fields - The current InvitationFields values from react-hook-form watch()
 * @param setStatus - State setter for AutosaveStatus
 */
export function useAutosave(
  invitationId: string,
  fields: InvitationFields,
  setStatus: (s: AutosaveStatus) => void
) {
  const [debouncedFields] = useDebounce(fields, 2000);
  // Track whether this is the initial mount (skip first debounce fire)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!debouncedFields) return;

    setStatus("saving");

    fetch(`/api/invitations/${invitationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: debouncedFields, title: debouncedFields.title }),
    })
      .then(() => setStatus("saved"))
      .catch(() => setStatus("idle"));
  }, [debouncedFields, invitationId, setStatus]);
}
