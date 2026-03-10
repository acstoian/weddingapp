import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { InvitationFields } from "@/lib/templates/schema";

// Mock fetch globally
const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
vi.stubGlobal("fetch", mockFetch);

// Import after mocks
import { useAutosave } from "@/components/editor/useAutosave";

const baseFields: InvitationFields = {
  title: "Test Invitation",
  names: "Ana & Ion",
  eventDatetime: "2026-06-15T16:00",
  venueName: "Sala Florilor",
  venueAddress: "Str. Florilor 1, Bucuresti",
};

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT fire fetch before 2s have elapsed", async () => {
    const setStatus = vi.fn();

    renderHook(() => useAutosave("inv-123", baseFields, setStatus));

    // Advance less than 2s
    await act(async () => {
      vi.advanceTimersByTime(1999);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalledWith("saving");
  });

  it("fires fetch exactly once after 2s with correct payload", async () => {
    const setStatus = vi.fn();

    const { rerender } = renderHook(
      ({ fields }: { fields: InvitationFields }) =>
        useAutosave("inv-456", fields, setStatus),
      { initialProps: { fields: baseFields } }
    );

    // Trigger a change
    const updatedFields: InvitationFields = { ...baseFields, title: "Updated Title" };
    rerender({ fields: updatedFields });

    // Advance past the 2s debounce
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/invitations/inv-456",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("Updated Title"),
      })
    );
  });

  it("status transitions: idle → saving → saved", async () => {
    const setStatus = vi.fn();

    const { rerender } = renderHook(
      ({ fields }: { fields: InvitationFields }) =>
        useAutosave("inv-789", fields, setStatus),
      { initialProps: { fields: baseFields } }
    );

    // Initially no saves triggered
    expect(setStatus).not.toHaveBeenCalledWith("saving");

    // Trigger a change
    const updatedFields: InvitationFields = { ...baseFields, names: "Elena & Andrei" };
    rerender({ fields: updatedFields });

    // Before 2s: no status change
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(setStatus).not.toHaveBeenCalledWith("saving");

    // After 2s: saving triggered
    await act(async () => {
      vi.advanceTimersByTime(1100);
      // Let microtasks (fetch promise resolution) settle
      await Promise.resolve();
    });

    expect(setStatus).toHaveBeenCalledWith("saving");
    expect(setStatus).toHaveBeenCalledWith("saved");

    // Verify order: saving before saved
    const calls = setStatus.mock.calls.map((c) => c[0]);
    const savingIndex = calls.indexOf("saving");
    const savedIndex = calls.indexOf("saved");
    expect(savingIndex).toBeLessThan(savedIndex);
  });
});
