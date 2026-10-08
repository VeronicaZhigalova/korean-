import type { Rest, SpaceGlyph, UniverseOptions, UniverseScene } from "@/components/motion/hangul-universe";

/*
  The Home's Hangul universe (8 Oct 2026). Characters fill the space around the
  centred hero copy at several depths. While the page scrolls, selected ones
  sink and settle into small compositions along the bottom of later sections:
  in each lower corner a lead character on the floor with a smaller companion
  raised beside it, clear of content. Each section also adds a
  faint character of its own that continues the descent. Positions are
  fractions of the section box; the engine slides any resting character clear
  of copy, cards and buttons.
*/

type Tone = SpaceGlyph["tone"];
const s = (g: string, x: number, y: number, z: number, size: number, rot: number, tone: Tone = "gold", fall?: Rest): SpaceGlyph => ({ g, x, y, z, size, rot, tone, fall });
const to = (section: string, x: number, z: number, size: number, rot: number, lift = 0.15): Rest => ({ section, x, lift, z, size, rot });

const desktop: UniverseScene[] = [
  {
    section: "hero",
    space: [
      // Left: 한 leads, 말 below it, a near ㅁ blurred and cropped at the lower edge.
      s("한", 0.215, 0.3, 0.72, 0.19, -8),
      s("말", 0.285, 0.7, 0.6, 0.11, 7),
      s("ㄱ", 0.1, 0.48, 0.5, 0.08, -18, "ivory", to("paths", 0.06, 0.62, 0.085, -8)),
      s("ㅁ", 0.12, 0.93, 0.95, 0.4, 12, "ivory"),
      s("배", 0.16, 0.1, 0.34, 0.06, 10, "gold", to("paths", 0.125, 0.4, 0.05, 12, 2.1)),
      s("ㅎ", 0.04, 0.24, 0.2, 0.05, 14, "ivory", to("alphabet", 0.125, 0.38, 0.042, -10, 2.2)),
      s("ㅈ", 0.05, 0.68, 0.24, 0.045, -9, "gold", to("alphabet", 0.06, 0.58, 0.08, -6)),
      s("ㅅ", 0.08, 0.86, 0.28, 0.045, 20, "gold", to("services", 0.125, 0.4, 0.045, 12, 2.0)),
      // Right: ㄷ leads high, ㅂ beyond it, ㅇ and 말 lower, a near ㅁ cropped at the right edge.
      s("ㄷ", 0.8, 0.27, 0.74, 0.2, 22),
      s("ㅂ", 0.93, 0.16, 0.52, 0.09, 9, "ivory", to("alphabet", 0.94, 0.58, 0.08, 8)),
      s("ㄹ", 0.88, 0.52, 0.56, 0.1, 16, "ivory", to("services", 0.06, 0.6, 0.085, -7)),
      s("ㅇ", 0.72, 0.72, 0.6, 0.08, 0, "ivory", to("paths", 0.875, 0.42, 0.045, 0, 2.3)),
      s("말", 0.67, 0.9, 0.4, 0.07, -12, "gold", to("teacher", 0.06, 0.66, 0.1, -8)),
      s("ㅁ", 1.0, 0.86, 0.95, 0.36, -14, "ivory"),
      s("움", 0.69, 0.08, 0.3, 0.05, -6, "gold", to("paths", 0.94, 0.62, 0.09, 6)),
      s("글", 0.96, 0.38, 0.26, 0.045, 8, "gold", to("teacher", 0.94, 0.62, 0.09, 7)),
      s("ㄴ", 0.79, 0.4, 0.14, 0.035, -16, "ivory", to("alphabet", 0.875, 0.38, 0.045, 10, 2.2)),
      s("ㅎ", 0.38, 0.12, 0.12, 0.035, 12, "gold", to("teacher", 0.13, 0.38, 0.042, 12, 2.3)),
    ],
  },
  // Each later section adds one faint, far character that continues the descent into the next.
  { section: "paths", space: [s("ㄷ", 0.97, 0.12, 0.2, 0.04, 10, "ivory", to("services", 0.875, 0.4, 0.045, -8, 2.1))] },
  { section: "alphabet", space: [s("ㅁ", 0.97, 0.15, 0.2, 0.04, -10, "gold", to("services", 0.94, 0.6, 0.08, 8))] },
  { section: "services", space: [s("ㄹ", 0.97, 0.15, 0.2, 0.04, 12, "ivory", to("teacher", 0.87, 0.4, 0.045, -6, 2.2))] },
];

// Tablet: fewer characters, simpler depth.
const tablet: UniverseScene[] = [
  {
    section: "hero",
    space: [
      s("한", 0.14, 0.12, 0.7, 0.16, -8),
      s("ㄷ", 0.86, 0.13, 0.7, 0.16, 20),
      s("말", 0.12, 0.88, 0.6, 0.12, 7, "gold", to("teacher", 0.08, 0.6, 0.09, -8)),
      s("ㅇ", 0.88, 0.86, 0.55, 0.09, 0, "ivory", to("teacher", 0.93, 0.5, 0.07, 0)),
      s("ㄱ", 0.04, 0.5, 0.45, 0.07, -16, "ivory", to("paths", 0.07, 0.56, 0.08, -8)),
      s("ㄹ", 0.96, 0.5, 0.45, 0.08, 14, "ivory", to("alphabet", 0.93, 0.56, 0.07, 10)),
      s("배", 0.35, 0.04, 0.3, 0.05, 10, "gold", to("services", 0.07, 0.56, 0.08, -6)),
      s("움", 0.64, 0.97, 0.3, 0.05, -8, "gold", to("paths", 0.93, 0.56, 0.08, 7)),
    ],
  },
];

// Phone: the copy fills the width, so characters keep to the top and bottom bands and the edges.
const mobile: UniverseScene[] = [
  {
    section: "hero",
    space: [
      s("한", 0.12, 0.05, 0.62, 0.16, -8),
      s("ㄷ", 0.9, 0.06, 0.6, 0.14, 20),
      s("말", 0.16, 0.95, 0.55, 0.14, 7, "gold", to("teacher", 0.1, 0.55, 0.11, -8)),
      s("ㅇ", 0.86, 0.96, 0.5, 0.1, 0, "ivory", to("paths", 0.9, 0.5, 0.1, 6)),
      s("배", 0.5, 0.02, 0.3, 0.07, 10, "gold", to("services", 0.9, 0.5, 0.11, 7)),
    ],
  },
];

export const homeUniverse: UniverseOptions = { scenes: { desktop, tablet, mobile } };
