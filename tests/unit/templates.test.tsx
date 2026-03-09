// REQ-01 — implemented in 01-03 Task 2
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MinimalWedding1 from "@/components/templates/MinimalWedding1";
import MinimalWedding2 from "@/components/templates/MinimalWedding2";
import MinimalWedding3 from "@/components/templates/MinimalWedding3";
import DecorativeWedding1 from "@/components/templates/DecorativeWedding1";
import MinimalBaptism1 from "@/components/templates/MinimalBaptism1";
import MinimalBaptism2 from "@/components/templates/MinimalBaptism2";
import { InvitationFields } from "@/lib/templates/schema";

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
    expect(() => render(<MinimalWedding1 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalWedding2 renders without throwing", () => {
    expect(() => render(<MinimalWedding2 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalWedding3 renders without throwing", () => {
    expect(() => render(<MinimalWedding3 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("DecorativeWedding1 renders without throwing", () => {
    expect(() =>
      render(<DecorativeWedding1 {...PREVIEW_FIXTURE} />)
    ).not.toThrow();
  });

  it("MinimalBaptism1 renders without throwing", () => {
    expect(() => render(<MinimalBaptism1 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });

  it("MinimalBaptism2 renders without throwing", () => {
    expect(() => render(<MinimalBaptism2 {...PREVIEW_FIXTURE} />)).not.toThrow();
  });
});
