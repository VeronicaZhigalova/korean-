import type { StoryOptions, StoryStop } from "@/components/motion/hangul-story";

/*
  The Home's Hangul sculpture, stop by stop (approved 7 Oct 2026). It forms
  in the open right of the hero, opens up and crops past the right edge
  behind the glass course cards, regroups into a ring behind the alphabet
  panel, loosens into a quiet field behind the services, and resolves into
  the teacher's 말. Each stop applies when its element is centred in the
  viewport; between stops the scroll blends one into the next.
*/

const base = { open: 0, ring: 0, field: 0, word: 0 };

const desktop: StoryStop[] = [
  { ...base, anchor: "hero", fy: 0.5, x: 0.75, y: 0.56, size: 0.27, tilt: 0.3, opacity: 1, still: true },
  { ...base, anchor: "paths", fy: 0.5, x: 0.84, y: 0.52, size: 0.46, tilt: 0.4, open: 1, opacity: 0.8 },
  { ...base, anchor: "alphabet", fy: 0.5, x: 0, y: 0, target: "alphabet-visual", size: 0.3, tilt: 1.05, ring: 1, opacity: 0.9, still: true },
  { ...base, anchor: "services", fy: 0.5, x: 0.5, y: 0.5, size: 0.4, tilt: 0.2, field: 1, opacity: 0.55 },
  { ...base, anchor: "teacher", fy: 0.5, x: 0, y: 0, target: "teacher-word", fit: true, size: 1, tilt: 0.2, word: 1, opacity: 1, still: true },
];

// Tablet and phone: a simpler path. The column is full width, so the
// sculpture forms in the open block under the hero buttons, then passes
// behind glass; no cropped moment.
const narrow: StoryStop[] = [
  { ...base, anchor: "hero-block", fy: 0.5, x: 0, y: 0, target: "hero-block", size: 0.4, tilt: 0.3, opacity: 1, still: true },
  { ...base, anchor: "paths", fy: 0.4, x: 0.7, y: 0.5, size: 0.5, tilt: 0.4, open: 0.8, opacity: 0.75 },
  { ...base, anchor: "alphabet-visual", fy: 0.5, x: 0, y: 0, target: "alphabet-visual", size: 0.38, tilt: 1.05, ring: 1, opacity: 0.85, still: true },
  { ...base, anchor: "services", fy: 0.5, x: 0.5, y: 0.5, size: 0.4, tilt: 0.2, field: 1, opacity: 0.5 },
  { ...base, anchor: "teacher-word", fy: 0.5, x: 0, y: 0, target: "teacher-word", fit: true, size: 1, tilt: 0.2, word: 1, opacity: 1, still: true },
];

export const homeStory: StoryOptions = {
  stops: { desktop, tablet: narrow, mobile: narrow },
  seed: 23,
};
