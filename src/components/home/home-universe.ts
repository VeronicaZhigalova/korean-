import type { GlyphPart, HeroGlyph, UniverseOptions } from "@/components/motion/hangul-universe";

/*
  The Home hero's glass Hangul (9 Oct 2026, art-directed). Two pieces only:
  - 한, dominant, on the left at the height of the headline, near and fully lit.
    It is built from its own jamo, ㅎ ㅏ ㄴ, each a separate piece of glass set
    in its cell of the syllable block: the modular construction of Hangul is
    the signature of the site.
  - 글, its answer, lower right: smaller, further back, softer and dimmer.
  The eye travels 한 → headline → 글 → CTA. Positions are fractions of the
  hero box; the engine slides either clear of the copy and the navigation.
*/

const g = (g: string, x: number, y: number, z: number, size: number, rot: number, parts?: GlyphPart[]): HeroGlyph => ({
  g,
  x,
  y,
  z,
  size,
  rot,
  parts,
});

// 한 as a block: initial ㅎ top left, vowel ㅏ tall on the right, final ㄴ across the bottom.
const han: GlyphPart[] = [
  { g: "ㅎ", x: -0.17, y: -0.2, s: 0.62 },
  { g: "ㅏ", x: 0.26, y: -0.15, s: 0.7 },
  { g: "ㄴ", x: -0.02, y: 0.27, s: 0.6 },
];

const desktop: HeroGlyph[] = [g("한", 0.15, 0.47, 0.8, 0.36, -4, han), g("글", 0.86, 0.7, 0.4, 0.16, 4)];
const tablet: HeroGlyph[] = [g("한", 0.2, 0.2, 0.8, 0.26, -4, han), g("글", 0.82, 0.84, 0.4, 0.13, 4)];
// Phone: the copy fills the width, so the pieces keep to the top and bottom bands.
const mobile: HeroGlyph[] = [g("한", 0.26, 0.19, 0.8, 0.3, -4, han), g("글", 0.8, 0.9, 0.4, 0.15, 4)];

export const homeUniverse: UniverseOptions = { section: "hero", scenes: { desktop, tablet, mobile } };
