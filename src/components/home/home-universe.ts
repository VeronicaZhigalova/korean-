import type { Rest, SpaceGlyph, UniverseOptions, UniverseScene } from "@/components/motion/hangul-universe";

/*
  The Home's Hangul universe (8 Oct 2026, refined after the Home review).
  Three depth layers surround the centred hero copy: a few near characters,
  large, soft and cropped by the edges; sharp middle characters that frame the
  copy; small, dim far ones. While the page scrolls, selected characters sink
  and settle at the bottom of the following sections, each section with its own
  composition:
  - Learning paths: 배움 ("learning") as a word on the left, and ㄱ ㄴ ㄷ, the
    first letters of the alphabet, in a low curve on the right.
  - Services: two quiet single letters at different heights.
  - Teacher: 한글 as a word on the right, a lone far ㅇ on the left.
  Positions are fractions of the section box; the engine slides any resting
  character clear of copy, the course showcase, cards and buttons.
*/

type Tone = SpaceGlyph["tone"];
const s = (g: string, x: number, y: number, z: number, size: number, rot: number, tone: Tone = "gold", fall?: Rest): SpaceGlyph => ({ g, x, y, z, size, rot, tone, fall });
const to = (section: string, x: number, z: number, size: number, rot: number, lift = 0.15): Rest => ({ section, x, lift, z, size, rot });

const desktop: UniverseScene[] = [
  {
    section: "hero",
    space: [
      // Near: two large, soft characters cropped by the lower left and upper right edges.
      s("ㅁ", 0.05, 0.92, 0.94, 0.25, 12, "ivory"),
      s("ㅎ", 0.985, 0.12, 0.92, 0.2, -10, "ivory"),
      // Middle: sharp characters framing the copy; 한 and ㄷ lead, 말 and ㄹ answer lower.
      s("한", 0.2, 0.31, 0.74, 0.16, -8),
      s("ㄷ", 0.81, 0.33, 0.72, 0.15, 20),
      s("말", 0.25, 0.73, 0.62, 0.1, 7),
      s("ㄹ", 0.86, 0.66, 0.6, 0.09, 16, "ivory"),
      // Characters that later descend into the sections.
      s("배", 0.14, 0.13, 0.46, 0.065, 10, "gold", to("paths", 0.055, 0.6, 0.075, -4, 0.2)),
      s("움", 0.68, 0.11, 0.42, 0.055, -6, "gold", to("paths", 0.115, 0.6, 0.075, 3, 0.2)),
      s("ㄱ", 0.08, 0.5, 0.5, 0.07, -18, "ivory", to("paths", 0.865, 0.46, 0.05, -10, 0.55)),
      s("ㄴ", 0.79, 0.45, 0.32, 0.04, -16, "ivory", to("paths", 0.91, 0.5, 0.055, 6, 0.15)),
      s("ㄷ", 0.95, 0.5, 0.3, 0.04, 10, "ivory", to("paths", 0.955, 0.42, 0.045, 12, 0.7)),
      s("ㅅ", 0.33, 0.93, 0.32, 0.04, 20, "gold", to("services", 0.06, 0.5, 0.055, -8, 0.3)),
      s("ㅈ", 0.04, 0.66, 0.26, 0.045, -9, "gold", to("services", 0.94, 0.4, 0.04, 9, 1.6)),
      s("한", 0.6, 0.06, 0.2, 0.035, 0, "gold", to("teacher", 0.885, 0.62, 0.07, -3, 0.25)),
      s("글", 0.9, 0.2, 0.28, 0.045, 8, "gold", to("teacher", 0.945, 0.62, 0.07, 4, 0.25)),
      s("ㅇ", 0.72, 0.84, 0.5, 0.06, 0, "ivory", to("teacher", 0.06, 0.34, 0.04, 0, 0.9)),
      // Far: small and dim, for depth only.
      s("ㅎ", 0.38, 0.1, 0.12, 0.03, 12),
      s("ㅂ", 0.64, 0.92, 0.22, 0.035, 9, "ivory"),
    ],
  },
];

// Tablet: fewer characters, the same three layers.
const tablet: UniverseScene[] = [
  {
    section: "hero",
    space: [
      s("한", 0.14, 0.13, 0.7, 0.14, -8),
      s("ㄷ", 0.86, 0.14, 0.7, 0.13, 20),
      s("ㅁ", 0.03, 0.95, 0.92, 0.2, 12, "ivory"),
      s("말", 0.16, 0.84, 0.6, 0.1, 7),
      s("배", 0.36, 0.05, 0.3, 0.05, 10, "gold", to("paths", 0.07, 0.55, 0.07, -4, 0.2)),
      s("움", 0.64, 0.96, 0.3, 0.05, -8, "gold", to("paths", 0.165, 0.55, 0.07, 3, 0.2)),
      s("ㅈ", 0.04, 0.5, 0.45, 0.06, -16, "ivory", to("services", 0.92, 0.5, 0.06, 8, 0.3)),
      s("한", 0.92, 0.6, 0.4, 0.05, 0, "gold", to("teacher", 0.8, 0.55, 0.065, -3, 0.25)),
      s("글", 0.88, 0.86, 0.5, 0.07, 6, "gold", to("teacher", 0.9, 0.55, 0.065, 4, 0.25)),
    ],
  },
];

// Phone: the copy fills the width, so characters keep to the top and bottom bands and the edges.
const mobile: UniverseScene[] = [
  {
    section: "hero",
    space: [
      s("한", 0.13, 0.06, 0.62, 0.15, -8),
      s("ㄷ", 0.88, 0.07, 0.6, 0.13, 20),
      s("말", 0.15, 0.95, 0.55, 0.12, 7, "gold", to("teacher", 0.12, 0.5, 0.1, -6, 0.2)),
      s("배", 0.5, 0.025, 0.3, 0.06, 10, "gold", to("paths", 0.1, 0.5, 0.09, -4, 0.2)),
      s("움", 0.62, 0.97, 0.3, 0.06, -6, "gold", to("paths", 0.26, 0.5, 0.09, 3, 0.2)),
      s("ㅇ", 0.88, 0.95, 0.5, 0.08, 0, "ivory", to("services", 0.9, 0.45, 0.07, 0, 0.3)),
    ],
  },
];

export const homeUniverse: UniverseOptions = { scenes: { desktop, tablet, mobile } };
