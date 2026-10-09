import type { HeroGlyph, UniverseOptions } from "@/components/motion/hangul-universe";

/*
  The Home hero's glass Hangul (9 Oct 2026). A deliberate composition around
  the centred copy rather than a field: two large near characters anchor
  opposite corners, a middle ring frames the headline at its sides, and a
  few small far ones add depth. Every piece stays in the hero; the engine
  slides any of them clear of the copy, the CTA and the navigation.
  Positions are fractions of the hero box.
*/

const g = (g: string, x: number, y: number, z: number, size: number, rot: number): HeroGlyph => ({ g, x, y, z, size, rot });

const desktop: HeroGlyph[] = [
  // Near.
  g("한", 0.17, 0.36, 0.78, 0.2, -7),
  g("글", 0.84, 0.62, 0.74, 0.17, 6),
  // Middle, framing the copy.
  g("ㄱ", 0.8, 0.27, 0.56, 0.09, 12),
  g("말", 0.24, 0.76, 0.52, 0.1, 5),
  g("ㅇ", 0.66, 0.84, 0.46, 0.06, 0),
  g("ㅎ", 0.07, 0.6, 0.42, 0.07, -10),
  // Far.
  g("ㄴ", 0.36, 0.17, 0.22, 0.045, -8),
  g("ㅅ", 0.93, 0.2, 0.2, 0.05, 9),
  g("배", 0.6, 0.15, 0.18, 0.04, 4),
];

const tablet: HeroGlyph[] = [
  g("한", 0.17, 0.2, 0.74, 0.17, -7),
  g("글", 0.83, 0.8, 0.7, 0.15, 6),
  g("ㄱ", 0.85, 0.22, 0.5, 0.08, 12),
  g("말", 0.18, 0.82, 0.5, 0.09, 5),
  g("ㅇ", 0.6, 0.93, 0.3, 0.05, 0),
  g("ㄴ", 0.45, 0.12, 0.22, 0.045, -8),
];

// Phone: the copy fills the width, so the characters keep to the top and bottom bands.
const mobile: HeroGlyph[] = [
  g("한", 0.2, 0.17, 0.7, 0.17, -7),
  g("글", 0.8, 0.88, 0.66, 0.15, 6),
  g("ㄱ", 0.82, 0.18, 0.45, 0.08, 12),
  g("말", 0.2, 0.9, 0.42, 0.08, 5),
];

export const homeUniverse: UniverseOptions = { section: "hero", scenes: { desktop, tablet, mobile } };
