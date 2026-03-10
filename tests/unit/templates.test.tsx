// REQ-01 — implemented in 01-03 Task 2
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import MinimalWedding1 from "@/components/templates/MinimalWedding1";
import MinimalWedding2 from "@/components/templates/MinimalWedding2";
import MinimalWedding3 from "@/components/templates/MinimalWedding3";
import DecorativeWedding1 from "@/components/templates/DecorativeWedding1";
import MinimalBaptism1 from "@/components/templates/MinimalBaptism1";
import MinimalBaptism2 from "@/components/templates/MinimalBaptism2";
import { InvitationFields } from "@/lib/templates/schema";

// Mock next/navigation for QROverlay tests
const mockSearchParams = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
}));

// Mock qrcode.react — renders a testable div instead of actual SVG QR code
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <div data-testid="qr-code" data-value={value} data-size={size} />
  ),
}));

const PREVIEW_FIXTURE: InvitationFields = {
  title: "Elena & Andrei",
  names: "Elena & Andrei",
  eventDatetime: "2026-08-15T16:00:00Z",
  venueName: "Catedrala Sfantul Iosif",
  venueAddress: "Calea Victoriei 56, Bucuresti",
  personalMessage: "Va asteptam cu drag la nunta noastra.",
  dresscodeRsvpNote: "Smart casual",
};

describe("template render smoke", () => {
  it("MinimalWedding1 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() => render(<MinimalWedding1 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalWedding2 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() => render(<MinimalWedding2 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalWedding3 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() => render(<MinimalWedding3 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("DecorativeWedding1 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() =>
      render(<DecorativeWedding1 {...PREVIEW_FIXTURE} />)
    ).not.toThrow();
  });

  it("MinimalBaptism1 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() => render(<MinimalBaptism1 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalBaptism2 renders without throwing", () => {
    mockSearchParams.mockReturnValue({ get: () => null });
    expect(() => render(<MinimalBaptism2 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });
});

describe("QROverlay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set a stable window.location for tests
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com", pathname: "/i/abc123" },
      writable: true,
    });
  });

  it("renders QR code when searchParams has print=true", () => {
    mockSearchParams.mockReturnValue({
      get: (key: string) => (key === "print" ? "true" : null),
    });
    const { getByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    expect(getByTestId("qr-code")).toBeTruthy();
  });

  it("does not render QR code when searchParams does not have print=true", () => {
    mockSearchParams.mockReturnValue({
      get: (_key: string) => null,
    });
    const { queryByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    expect(queryByTestId("qr-code")).toBeNull();
  });

  it("does not render QR code when searchParams is empty", () => {
    mockSearchParams.mockReturnValue({
      get: (_key: string) => null,
    });
    const { queryByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    expect(queryByTestId("qr-code")).toBeNull();
  });

  it("QR value encodes origin + pathname (no query string)", () => {
    mockSearchParams.mockReturnValue({
      get: (key: string) => (key === "print" ? "true" : null),
    });
    const { getByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    const qr = getByTestId("qr-code");
    expect(qr.getAttribute("data-value")).toBe("https://example.com/i/abc123");
  });

  it("QRCodeSVG receives size={170}", () => {
    mockSearchParams.mockReturnValue({
      get: (key: string) => (key === "print" ? "true" : null),
    });
    const { getByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    const qr = getByTestId("qr-code");
    expect(qr.getAttribute("data-size")).toBe("170");
  });

  it("QROverlay has white background container with borderRadius style", () => {
    mockSearchParams.mockReturnValue({
      get: (key: string) => (key === "print" ? "true" : null),
    });
    const { getByTestId } = render(<MinimalWedding1 {...PREVIEW_FIXTURE} />);
    const qr = getByTestId("qr-code");
    // The parent container should have white background and border radius
    const container = qr.parentElement;
    expect(container).toBeTruthy();
    expect(container!.style.backgroundColor).toBe("white");
    expect(container!.style.borderRadius).toBeTruthy();
  });
});
