import type { FlowOptions, FlowPoint } from "./flow-engine";

/*
  Route of the Hangul current through the Home. Each point is pinned to an
  element marked data-flow="…" (x and y as fractions of its box), with the
  band width and intensity there: wide and bright in open space, narrow and
  quiet where it passes copy. The current rises in the open right of the
  hero, runs behind the course cards, the alphabet panel and the service
  cards, and gathers around the teacher's 말 at the end of the page.
*/

const desktop: FlowPoint[] = [
  ["hero", 0.8, -0.04, 0.7, 0.85],
  ["hero", 0.69, 0.26, 1.25, 1],
  ["hero", 0.86, 0.58, 1.35, 1],
  ["hero", 0.72, 0.95, 1, 0.8],
  ["paths", 0.955, 0.13, 0.55, 0.45],
  ["topik", 0.62, 0.48, 1.05, 0.85],
  ["general", 0.72, 0.8, 1.1, 0.75],
  ["paths", 0.2, 1, 0.8, 0.6],
  ["alphabet-visual", 0.28, 0.22, 1.1, 0.85],
  ["alphabet-visual", 0.78, 0.88, 1, 0.8],
  ["alphabet", 0.6, 1, 0.65, 0.5],
  ["services", 0.955, 0.16, 0.5, 0.4],
  ["chat", 0.42, 0.55, 1.05, 0.8],
  ["coaching", 0.62, 0.86, 1, 0.75],
  ["services", 0.4, 1, 0.7, 0.55],
  ["teacher", 0.6, 0.18, 0.8, 0.6],
  ["teacher-glyph", 0.42, 0.42, 1.35, 1],
  ["teacher-glyph", 0.7, 0.78, 1.1, 0.8],
  ["teacher", 0.97, 1.02, 0.3, 0.15],
];

// Tablet and phone: copy fills the width, so the current keeps to the
// margins beside text and crosses the column only in open space (the hero
// block) or behind glass panels.
const narrow: FlowPoint[] = [
  ["hero", 0.975, -0.02, 0.4, 0.5],
  ["hero-block", 0.975, 0, 0.5, 0.7],
  ["hero-block", 0.34, 0.4, 1.1, 1],
  ["hero-block", 0.72, 0.86, 1.1, 1],
  ["hero-block", 0.975, 1.02, 0.5, 0.55],
  ["paths", 0.975, 0.2, 0.4, 0.35],
  ["general", 0.97, 0.06, 0.5, 0.5],
  ["general", 0.6, 0.55, 0.9, 0.75],
  ["topik", 0.4, 0.5, 0.9, 0.7],
  ["quiz", 0.03, 0.5, 0.5, 0.45],
  ["paths", 0.025, 1, 0.4, 0.35],
  ["alphabet", 0.025, 0.3, 0.35, 0.3],
  ["alphabet-visual", 0.03, 0.02, 0.5, 0.5],
  ["alphabet-visual", 0.5, 0.45, 1.1, 0.9],
  ["alphabet-visual", 0.97, 1, 0.6, 0.6],
  ["alphabet", 0.975, 1, 0.4, 0.35],
  ["services", 0.975, 0.2, 0.35, 0.3],
  ["coaching", 0.97, 0.06, 0.5, 0.5],
  ["coaching", 0.4, 0.6, 0.9, 0.7],
  ["chat", 0.6, 0.5, 0.9, 0.7],
  ["chat", 0.03, 1, 0.5, 0.45],
  ["teacher", 0.025, 0.35, 0.35, 0.3],
  ["teacher-glyph", 0.5, 0.5, 1.15, 1],
  ["teacher", 0.95, 1.02, 0.3, 0.12],
];

export const homeFlow: FlowOptions = {
  routes: { desktop, tablet: narrow, mobile: narrow },
  seed: 11,
};
