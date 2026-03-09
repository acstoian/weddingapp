/**
 * Mock for next/font/google — returns a stub with className so template
 * components can be imported in vitest (non-Next.js environment).
 */

type FontResult = { className: string; style: { fontFamily: string } };

function mockFont(name: string): () => FontResult {
  return () => ({ className: `mock-font-${name.toLowerCase().replace(/\s+/g, "-")}`, style: { fontFamily: name } });
}

export const Cormorant_Garamond = mockFont("Cormorant Garamond");
export const Lato = mockFont("Lato");
export const Playfair_Display = mockFont("Playfair Display");
export const Source_Sans_3 = mockFont("Source Sans 3");
export const EB_Garamond = mockFont("EB Garamond");
export const Inter = mockFont("Inter");
export const Great_Vibes = mockFont("Great Vibes");
export const Nunito = mockFont("Nunito");
export const Quicksand = mockFont("Quicksand");
