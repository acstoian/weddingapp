import React from "react";
import { InvitationFields } from "./schema";
import MinimalWedding1 from "@/components/templates/MinimalWedding1";
import MinimalWedding2 from "@/components/templates/MinimalWedding2";
import MinimalWedding3 from "@/components/templates/MinimalWedding3";
import DecorativeWedding1 from "@/components/templates/DecorativeWedding1";
import MinimalBaptism1 from "@/components/templates/MinimalBaptism1";
import MinimalBaptism2 from "@/components/templates/MinimalBaptism2";

export interface TemplateDefinition {
  id: string;
  name: string;
  category: "WEDDING" | "BAPTISM";
  style: "MINIMAL" | "DECORATIVE";
  thumbnailUrl: string;
  googleFonts: string[];
  component: React.ComponentType<InvitationFields>;
}

export const templates: TemplateDefinition[] = [
  {
    id: "minimal-wedding-1",
    name: "Luminos",
    category: "WEDDING",
    style: "MINIMAL",
    thumbnailUrl: "/templates/minimal-wedding-1-thumb.svg",
    googleFonts: ["Cormorant Garamond", "Lato"],
    component: MinimalWedding1,
  },
  {
    id: "minimal-wedding-2",
    name: "Seren",
    category: "WEDDING",
    style: "MINIMAL",
    thumbnailUrl: "/templates/minimal-wedding-2-thumb.svg",
    googleFonts: ["Playfair Display", "Source Sans Pro"],
    component: MinimalWedding2,
  },
  {
    id: "minimal-wedding-3",
    name: "Briza",
    category: "WEDDING",
    style: "MINIMAL",
    thumbnailUrl: "/templates/minimal-wedding-3-thumb.svg",
    googleFonts: ["EB Garamond", "Inter"],
    component: MinimalWedding3,
  },
  {
    id: "decorative-wedding-1",
    name: "Botanica",
    category: "WEDDING",
    style: "DECORATIVE",
    thumbnailUrl: "/templates/decorative-wedding-1-thumb.svg",
    googleFonts: ["Great Vibes", "Cormorant Garamond", "Lato"],
    component: DecorativeWedding1,
  },
  {
    id: "minimal-baptism-1",
    name: "Zefir",
    category: "BAPTISM",
    style: "MINIMAL",
    thumbnailUrl: "/templates/minimal-baptism-1-thumb.svg",
    googleFonts: ["Nunito", "Lato"],
    component: MinimalBaptism1,
  },
  {
    id: "minimal-baptism-2",
    name: "Nor",
    category: "BAPTISM",
    style: "MINIMAL",
    thumbnailUrl: "/templates/minimal-baptism-2-thumb.svg",
    googleFonts: ["Quicksand", "Inter"],
    component: MinimalBaptism2,
  },
];

/**
 * Get a template definition by its ID.
 * @throws Error if the template is not found.
 */
export function getTemplate(id: string): TemplateDefinition {
  const template = templates.find((t) => t.id === id);
  if (!template) {
    throw new Error(
      `Template "${id}" not found. Available IDs: ${templates.map((t) => t.id).join(", ")}`
    );
  }
  return template;
}
