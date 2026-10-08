import type { StoryOptions, StoryStop } from "@/components/motion/hangul-story";

/*
  The Home's Hangul Bloom, stop by stop (approved 8 Oct 2026). On first load a
  seed of jamo blooms in the open right of the hero and settles into 한글.
  Scrolling continues the same object: it opens and moves behind the glass
  course cards, comes apart into single jamo for the alphabet, thins into a
  quiet field behind the services, and resolves into the teacher's 말. Each
  stop applies when its element is centred in the viewport; between stops the
  scroll blends one into the next, in both directions.
*/

const base = { turn: 0, tilt: 0.2, open: 0, form: 0, letters: 0, field: 0, word: 0 };

const desktop: StoryStop[] = [
  { ...base, anchor: "hero", fy: 0.5, x: 0.75, y: 0.54, size: 0.3, form: 1, light: 1, opacity: 1, still: true },
  { ...base, anchor: "paths", fy: 0.5, x: 0.68, y: 0.52, size: 0.52, turn: 0.55, tilt: 0.35, open: 1, light: 0.6, opacity: 1 },
  { ...base, anchor: "alphabet", fy: 0.5, x: 0, y: 0, target: "alphabet-visual", size: 0.32, tilt: 0, letters: 1, light: 0.4, opacity: 0.95, still: true },
  { ...base, anchor: "services", fy: 0.5, x: 0.5, y: 0.5, size: 0.42, field: 1, light: 0.15, opacity: 0.5 },
  { ...base, anchor: "teacher", fy: 0.5, x: 0, y: 0, target: "teacher-word", fit: true, size: 1, word: 1, light: 0.7, opacity: 1, still: true },
];

// Tablet and phone: the column is full width, so the bloom grows in the open
// block under the hero buttons, then passes behind glass; no cropped moment.
const narrow: StoryStop[] = [
  { ...base, anchor: "hero-block", fy: 0.5, x: 0, y: 0, target: "hero-block", size: 0.42, form: 1, light: 1, opacity: 1, still: true },
  { ...base, anchor: "paths", fy: 0.4, x: 0.6, y: 0.5, size: 0.52, turn: 0.45, tilt: 0.35, open: 0.8, light: 0.55, opacity: 0.95 },
  { ...base, anchor: "alphabet-visual", fy: 0.5, x: 0, y: 0, target: "alphabet-visual", size: 0.4, tilt: 0, letters: 1, light: 0.4, opacity: 0.9, still: true },
  { ...base, anchor: "services", fy: 0.5, x: 0.5, y: 0.5, size: 0.42, field: 1, light: 0.15, opacity: 0.45 },
  { ...base, anchor: "teacher-word", fy: 0.5, x: 0, y: 0, target: "teacher-word", fit: true, size: 1, word: 1, light: 0.7, opacity: 1, still: true },
];

// On tablets the alphabet panel is short for its width, so the letters sit closer beneath it.
const tablet = narrow.map((stop) => (stop.anchor === "alphabet-visual" ? { ...stop, size: 0.2 } : stop));

export const homeStory: StoryOptions = {
  stops: { desktop, tablet, mobile: narrow },
  seed: 23,
};
