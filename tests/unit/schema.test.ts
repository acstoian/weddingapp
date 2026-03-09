import { describe, it, expect } from "vitest";
import { InvitationFieldsSchema } from "@/lib/templates/schema";
import { templates, getTemplate } from "@/lib/templates/registry";

describe("InvitationFieldsSchema", () => {
  it("validates all 7 fields when all provided", () => {
    const result = InvitationFieldsSchema.parse({
      title: "Elena & Andrei",
      names: "Elena & Andrei",
      eventDatetime: "2026-08-15T16:00:00Z",
      venueName: "Catedrala Sfantul Iosif",
      venueAddress: "Calea Victoriei 56, Bucuresti",
      coverPhotoUrl: "https://example.com/photo.jpg",
      personalMessage: "Va asteptam cu drag la nunta noastra.",
      dresscodeRsvpNote: "Smart casual",
    });
    expect(result.title).toBe("Elena & Andrei");
    expect(result.names).toBe("Elena & Andrei");
    expect(result.coverPhotoUrl).toBe("https://example.com/photo.jpg");
  });

  it("accepts valid InvitationFields with only required fields", () => {
    const result = InvitationFieldsSchema.parse({
      title: "Test",
      names: "Ana & Ion",
      eventDatetime: "2026-08-15T16:00:00Z",
      venueName: "Catedrala",
      venueAddress: "Str. Unirii 1",
    });
    expect(result.title).toBe("Test");
    expect(result.coverPhotoUrl).toBeUndefined();
    expect(result.personalMessage).toBeUndefined();
    expect(result.dresscodeRsvpNote).toBeUndefined();
  });

  it("rejects empty title (min 1)", () => {
    expect(() =>
      InvitationFieldsSchema.parse({
        title: "",
        names: "Ana & Ion",
        eventDatetime: "2026-08-15T16:00:00Z",
        venueName: "Catedrala",
        venueAddress: "Str. Unirii 1",
      })
    ).toThrow();
  });

  it("rejects missing required title", () => {
    expect(() =>
      InvitationFieldsSchema.parse({
        names: "Ana & Ion",
        eventDatetime: "2026-08-15T16:00:00Z",
        venueName: "Catedrala",
        venueAddress: "Str. Unirii 1",
      })
    ).toThrow();
  });

  it("rejects missing required names", () => {
    expect(() =>
      InvitationFieldsSchema.parse({
        title: "Test",
        eventDatetime: "2026-08-15T16:00:00Z",
        venueName: "Catedrala",
        venueAddress: "Str. Unirii 1",
      })
    ).toThrow();
  });

  it("rejects coverPhotoUrl that is not a URL", () => {
    expect(() =>
      InvitationFieldsSchema.parse({
        title: "Test",
        names: "Ana & Ion",
        eventDatetime: "2026-08-15T16:00:00Z",
        venueName: "Catedrala",
        venueAddress: "Str. Unirii 1",
        coverPhotoUrl: "not-a-url",
      })
    ).toThrow();
  });

  it("allows personalMessage up to 500 chars", () => {
    const msg = "a".repeat(500);
    const result = InvitationFieldsSchema.parse({
      title: "Test",
      names: "Ana & Ion",
      eventDatetime: "2026-08-15T16:00:00Z",
      venueName: "Catedrala",
      venueAddress: "Str. Unirii 1",
      personalMessage: msg,
    });
    expect(result.personalMessage).toHaveLength(500);
  });

  it("rejects personalMessage over 500 chars", () => {
    const msg = "a".repeat(501);
    expect(() =>
      InvitationFieldsSchema.parse({
        title: "Test",
        names: "Ana & Ion",
        eventDatetime: "2026-08-15T16:00:00Z",
        venueName: "Catedrala",
        venueAddress: "Str. Unirii 1",
        personalMessage: msg,
      })
    ).toThrow();
  });

  it("accepts valid ISO 8601 eventDatetime", () => {
    const result = InvitationFieldsSchema.parse({
      title: "Test",
      names: "Ana & Ion",
      eventDatetime: "2026-08-15T16:00:00Z",
      venueName: "Catedrala",
      venueAddress: "Str. Unirii 1",
    });
    expect(result.eventDatetime).toBe("2026-08-15T16:00:00Z");
  });

  it("accepts missing optional fields", () => {
    const result = InvitationFieldsSchema.parse({
      title: "Test",
      names: "Ana & Ion",
      eventDatetime: "2026-08-15T16:00:00Z",
      venueName: "Catedrala",
      venueAddress: "Str. Unirii 1",
    });
    expect(result.coverPhotoUrl).toBeUndefined();
    expect(result.personalMessage).toBeUndefined();
    expect(result.dresscodeRsvpNote).toBeUndefined();
  });
});

describe("Template registry", () => {
  it("exports exactly 6 templates", () => {
    expect(templates.length).toBe(6);
  });

  it("has 4 WEDDING templates", () => {
    expect(templates.filter((t) => t.category === "WEDDING").length).toBe(4);
  });

  it("has 2 BAPTISM templates", () => {
    expect(templates.filter((t) => t.category === "BAPTISM").length).toBe(2);
  });

  it("getTemplate returns correct TemplateDefinition for minimal-wedding-1", () => {
    const t = getTemplate("minimal-wedding-1");
    expect(t.id).toBe("minimal-wedding-1");
    expect(t.name).toBe("Luminos");
    expect(t.category).toBe("WEDDING");
  });

  it("getTemplate throws for nonexistent id", () => {
    expect(() => getTemplate("nonexistent")).toThrow();
  });
});
