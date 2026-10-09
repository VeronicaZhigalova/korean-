import type { HeroGlyph, UniverseOptions } from "@/components/motion/hangul-universe";

/*
  The Home hero's glass Hangul (9 Oct 2026, recomposed). Not a field: one
  dominant 한 leans in from the left at the height of the headline, its
  answer 글 sits lower right, smaller and further back, so the eye travels
  한 → headline → 글 → CTA. Three small far characters give depth along that
  diagonal. The engine slides any of them clear of the copy, the CTA and the
  navigation. Positions are fractions of the hero box.
*/

const g = (g: string, x: number, y: number, z: number, size: number, rot: number): HeroGlyph => ({ g, x, y, z, size, rot });

const desktop: HeroGlyph[] = [
  g("한", 0.16, 0.45, 0.82, 0.27, -6),
  g("글", 0.85, 0.71, 0.66, 0.15, 5),
  g("ㄱ", 0.79, 0.24, 0.42, 0.06, 10),
  g("ㅇ", 0.33, 0.84, 0.3, 0.045, 0),
  g("ㄴ", 0.94, 0.42, 0.22, 0.04, -8),
];

const tablet: HeroGlyph[] = [
  g("한", 0.2, 0.2, 0.8, 0.2, -6),
  g("글", 0.82, 0.83, 0.64, 0.13, 5),
  g("ㄱ", 0.84, 0.2, 0.4, 0.06, 10),
  g("ㅇ", 0.22, 0.86, 0.28, 0.045, 0),
];

// Phone: the copy fills the width, so the characters keep to the top and bottom bands.
const mobile: HeroGlyph[] = [
  g("한", 0.24, 0.17, 0.78, 0.2, -6),
  g("글", 0.78, 0.89, 0.62, 0.13, 5),
  g("ㄱ", 0.84, 0.15, 0.36, 0.06, 10),
];

export const homeUniverse: UniverseOptions = { section: "hero", scenes: { desktop, tablet, mobile } };
