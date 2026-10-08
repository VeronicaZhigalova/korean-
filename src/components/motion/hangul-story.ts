/*
  Hangul Bloom: one object made of Hangul that is born in the hero and
  travels down a page with the scroll, framework-free so the site and its
  review preview run the same code.

  On first load a small, dense seed of jamo (ㅇ ㅎ ㄱ ㄴ ㅁ ㅅ) lit from inside
  blooms once: a wave of opening spreads outward from the light, each jamo
  turning open and moving out through depth, supporting jamo emerging as the
  wave reaches them, warm light showing between the layers. At the front,
  ㅎ ㅏ ㄴ and ㄱ ㅡ ㄹ settle into the places they hold inside a syllable and
  become 한 and 글. The bloom runs on a clock only until it is complete; if
  the reader scrolls first, it finishes quickly from where it is, so nothing
  jumps or restarts.

  From then on the scroll drives it. It is drawn into a viewport-sized stage
  pinned behind the content (CSS sticky, so the page scrolls normally). The
  page defines stops, each tied to an element: where the object sits when
  that element is centred in the viewport, its size, turn and tilt, how far
  it has opened, whether 한글 is formed, whether it has come apart into the
  alphabet's single letters, loosened into a field or resolved into the word
  말, and how bright its light is. Between stops everything follows the scroll
  position, so scrolling back plays it back.

  Depth reads through perspective scale, opacity, a soft blur on the farthest
  layer and the light: characters near it are warm (the nearest catch gold),
  those far from it sink into navy. Characters dim over copy and behind glass
  so text always reads first. One requestAnimationFrame loop writes transform
  and opacity (and colour steps that change rarely); characters never change
  text, so it causes no layout. With reduced motion there is no bloom: the
  stops marked `still` become still compositions placed beside their sections.
*/

export type StoryStop = {
  /** Element key (data-story) the stop is tied to, and the point of it that sits mid-viewport. */
  anchor: string;
  fy: number;
  /** Centre as fractions of the viewport, unless `target` names an element to centre on. */
  x: number;
  y: number;
  target?: string;
  /** Radius as a fraction of the smaller viewport side, or half the target's height with `fit`. */
  size: number;
  fit?: boolean;
  /** Turn around the vertical axis and tilt towards the reader, radians. */
  turn: number;
  tilt: number;
  /** 0..1: the bloomed structure opens further and its characters separate. */
  open: number;
  /** 0..1: 한글 formed at the front. */
  form: number;
  /** 0..1 each: come apart into single letters, loosen into a field, resolve into the word 말. */
  letters: number;
  field: number;
  word: number;
  /** Brightness of the light inside the object. */
  light: number;
  opacity: number;
  /** Shown as a still composition with reduced motion. */
  still?: boolean;
};

export type StoryOptions = {
  stops: { desktop: StoryStop[]; tablet: StoryStop[]; mobile: StoryStop[] };
  seed: number;
};

type Mode = "desktop" | "tablet" | "mobile";

/** Jamo in the seed, supporting jamo the bloom reveals, and large jamo that open towards the viewer. */
const BUILD: Record<Mode, { seed: number; outer: number; near: number }> = {
  desktop: { seed: 40, outer: 60, near: 4 },
  tablet: { seed: 30, outer: 45, near: 3 },
  mobile: { seed: 24, outer: 33, near: 2 },
};

const SEED_JAMO = ["ㅇ", "ㅎ", "ㄱ", "ㄴ", "ㅁ", "ㅅ"];
// Large forms near the viewer avoid ㅇ, which reads as a ring rather than a letter at that size.
const NEAR_JAMO = ["ㅎ", "ㄱ", "ㄴ", "ㅁ", "ㅅ"];
const CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ", "ㅡ"];

type Vec = [number, number, number];

/** The two syllables and where each component sits inside them (em of the syllable, y down). */
const SYLLABLES: { glyph: string; centre: Vec; parts: { glyph: string; x: number; y: number; size: number }[] }[] = [
  {
    glyph: "한",
    centre: [-0.24, 0.04, 0.62],
    parts: [
      { glyph: "ㅎ", x: -0.19, y: -0.17, size: 0.5 },
      { glyph: "ㅏ", x: 0.27, y: -0.07, size: 0.62 },
      { glyph: "ㄴ", x: -0.05, y: 0.27, size: 0.5 },
    ],
  },
  {
    glyph: "글",
    centre: [0.24, 0.04, 0.62],
    parts: [
      { glyph: "ㄱ", x: 0, y: -0.25, size: 0.55 },
      { glyph: "ㅡ", x: 0, y: 0.03, size: 0.9 },
      { glyph: "ㄹ", x: 0, y: 0.29, size: 0.5 },
    ],
  },
];
/** Syllable size, em of the base size. */
const SYLLABLE_EM = 3.7;
/** Size of a letter when the object has come apart into the alphabet. */
const LETTER_EM = 1.7;
/** Seconds the first bloom takes, and how fast it finishes once the reader scrolls. */
const BLOOM_SECONDS = 4;
const BLOOM_HURRY_SECONDS = 1.1;
/** Fonts are set this much larger than drawn, so the open structure can grow without blurring. */
const RASTER = 1.6;

/* Small seeded PRNG (mulberry32). */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const smooth = (v: number) => v * v * (3 - 2 * v);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Eased progress of a phase that runs from `from` to `to` on a 0..1 clock. */
const phase = (v: number, from: number, to: number) => smooth(clamp01((v - from) / (to - from)));

const normalize = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scaled = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];

type Box = { left: number; top: number; width: number; height: number };

/** Box of `el` relative to `root`, from layout offsets (ignores transforms). */
const boxIn = (el: HTMLElement, root: HTMLElement): Box => {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  if (node !== root) {
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight };
};

/* Readability: characters dim over copy and behind glass ---------------- */

type Shade = Box & { factor: number };

const COPY = "h1, h2, h3, p, dl, ol, figcaption, .lg";

const measureShades = (root: HTMLElement): Shade[] => {
  const shades: Shade[] = [];
  root.querySelectorAll<HTMLElement>("[data-atmo-glass]").forEach((el) => shades.push({ ...boxIn(el, root), factor: 0.6 }));
  root.querySelectorAll<HTMLElement>(COPY).forEach((el) => {
    // Copy on glass is already protected by the glass blur.
    if (el.closest(".hangul-story, [data-atmo-glass]") || !el.offsetWidth) return;
    shades.push({ ...boxIn(el, root), factor: 0.12 });
  });
  return shades;
};

const shadeAt = (shades: Shade[], x: number, y: number, radius: number) => {
  let factor = 1;
  for (const box of shades) {
    const dx = Math.max(box.left - x, 0, x - box.left - box.width);
    const dy = Math.max(box.top - y, 0, y - box.top - box.height);
    const gap = Math.hypot(dx, dy) - radius;
    if (gap >= 28) continue;
    const t = gap <= 0 ? 1 : 1 - smooth(gap / 28);
    factor *= 1 - (1 - box.factor) * t;
  }
  return factor;
};

/* The object ----------------------------------------------------------- */

type Part = {
  node: HTMLElement;
  /** seed: the luminous knot; outer: supporting jamo the bloom reveals; near: large jamo that open towards
      the viewer; key: the jamo that become 한 and 글; syllable: 한 or 글 itself; word: the drawn 말. */
  kind: "seed" | "outer" | "near" | "key" | "syllable" | "word";
  /** Size in em of the base size, and the larger size its font is set at, so that it is only ever
      scaled down (a transformed layer keeps the resolution it was first drawn at). */
  size: number;
  raster: number;
  /** Position in the closed seed and in the bloomed structure (unit radius). */
  closed: Vec;
  open: Vec;
  /** Shut in the seed (degrees turned in the plane, and folded away from the reader), and at rest when open. */
  closedAngle: number;
  closedFold: number;
  openAngle: number;
  /** Where the bloom's wave reaches it, 0..1. */
  delay: number;
  /** How far it moves out when the structure opens further. */
  lift: number;
  phase: number;
  /** Syllable index (0 한, 1 글) for keys and syllables, and a key's place inside its syllable. */
  syllable: number;
  inSyllable: { x: number; y: number };
  /** Alphabet order when it becomes one of the single letters, else -1. */
  letter: number;
  letterAt: Vec;
  field: Vec;
  /** Position in the word 말, flat, unit half-height; filled once the font is ready. */
  word: [number, number];
  light: number;
  layer: number;
  warm: boolean;
};

const buildParts = (mode: Mode, seed: number, parent: HTMLElement) => {
  const r = rng(seed);
  const plan = BUILD[mode];
  const parts: Part[] = [];
  const pick = <T>(list: T[]) => list[Math.floor(r() * list.length)];
  const add = (kind: Part["kind"], glyph: string, size: number, closed: Vec, open: Vec, delay: number) => {
    const node = document.createElement("span");
    node.className = `hs-glyph hs-${kind}`;
    node.dataset.g = glyph;
    const raster = size * RASTER;
    node.style.fontSize = `${raster.toFixed(2)}em`;
    node.style.opacity = "0";
    parent.appendChild(node);
    const part: Part = {
      node,
      kind,
      size,
      raster,
      closed,
      open,
      closedAngle: (r() - 0.5) * 140,
      closedFold: 45 + r() * 35,
      openAngle: (r() - 0.5) * 22,
      delay,
      lift: 0.25 + r() * 0.4,
      phase: r() * Math.PI * 2,
      syllable: -1,
      inSyllable: { x: 0, y: 0 },
      letter: -1,
      letterAt: [0, 0, 0],
      field: [0, 0, 0],
      word: [0, 0],
      light: -1,
      layer: -1,
      warm: false,
    };
    parts.push(part);
    return part;
  };

  // Parts drawn much larger than their size at some stop get a larger font to scale down from.
  const sharpen = (part: Part, raster: number) => {
    part.raster = Math.max(part.raster, raster);
    part.node.style.fontSize = `${part.raster.toFixed(2)}em`;
  };

  // The bloom opens along three tilted planes through the light, each covering part of a circle,
  // so it reads as a structure unfolding rather than petals around a centre.
  const planes = (
    [
      [0.2, 1, 0.3],
      [1, 0.25, 0.45],
      [-0.55, 0.45, 1],
    ] as Vec[]
  ).map((n) => {
    const axis = normalize(n);
    const u = normalize(cross(axis, Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]));
    return { axis, u, v: cross(axis, u), start: r() * Math.PI * 2, span: Math.PI * (1.2 + r() * 0.4) };
  });
  const onPlane = (radius: number, depthJitter: number, which = Math.floor(r() * planes.length), along = r()): Vec => {
    const plane = planes[which % planes.length];
    const a = plane.start + along * plane.span;
    const c = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    const off = (r() - 0.5) * depthJitter;
    return [
      plane.u[0] * c + plane.v[0] * s + plane.axis[0] * off,
      plane.u[1] * c + plane.v[1] * s + plane.axis[1] * off,
      plane.u[2] * c + plane.v[2] * s + plane.axis[2] * off,
    ];
  };
  // The wave starts at the light and travels outward, a little sooner towards the upper right.
  const waveDelay = (open: Vec, base: number) => {
    const reach = Math.hypot(open[0], open[1], open[2]);
    return clamp01(base + reach * 0.3 - (open[0] - open[1]) * 0.04);
  };

  // 한 and 글 first (the keys are placed relative to them): the syllable, then its components,
  // which drift together at the front and settle where they belong inside it.
  SYLLABLES.forEach((syllable, s) => {
    const whole = add("syllable", syllable.glyph, SYLLABLE_EM, scaled(syllable.centre, 0.1), syllable.centre, 0.3);
    whole.syllable = s;
    syllable.parts.forEach((component) => {
      const open: Vec = [syllable.centre[0] + (r() - 0.5) * 0.5, syllable.centre[1] + (r() - 0.5) * 0.45, syllable.centre[2]];
      const part = add("key", component.glyph, component.size * SYLLABLE_EM, scaled(open, 0.1), open, 0.2 + r() * 0.1);
      part.syllable = s;
      part.inSyllable = { x: component.x, y: component.y };
    });
  });

  // 말: drawn over the teacher's character once the jamo have gathered into it.
  sharpen(add("word", "말", SYLLABLE_EM, [0, 0, 0], [0, 0, 0], 0), SYLLABLE_EM * 2.6);

  // Seed: a tight knot of small jamo around the light, overlapping at several depths.
  for (let i = 0; i < plan.seed; i++) {
    const open = onPlane(0.3 + Math.sqrt(r()) * 0.45, 0.35);
    const closed = scaled(normalize(open), 0.08 + r() * 0.18);
    add("seed", SEED_JAMO[i % SEED_JAMO.length], 0.62 + r() * 0.22, closed, open, waveDelay(open, 0));
  }

  // Supporting jamo: deep inside the seed until the wave reaches them, then out along the planes as
  // three curving arms that widen as they go, so the growth reads as one organism, not a scatter.
  // The first fourteen are the consonants in order; they become the alphabet's single letters.
  const perArm = Math.ceil(plan.outer / planes.length);
  for (let i = 0; i < plan.outer; i++) {
    const along = (Math.floor(i / planes.length) + r() * 0.6) / perArm;
    const open = onPlane(0.62 + along * 0.72 + (r() - 0.5) * 0.12, 0.12 + along * 0.2, i, along);
    const glyph = i < CONSONANTS.length ? CONSONANTS[i] : r() < 0.6 ? pick(CONSONANTS) : pick(VOWELS);
    // Mostly small and supporting; a few larger ones keep the hierarchy varied.
    const size = r() < 0.12 ? 1.1 + r() * 0.2 : 0.66 + r() * 0.28 - along * 0.12;
    const part = add("outer", glyph, size, scaled(open, 0.12), open, waveDelay(open, 0.12));
    if (i < CONSONANTS.length) {
      part.letter = i;
      sharpen(part, LETTER_EM * 1.8);
    }
  }

  // Near jamo: a few large forms at the ends of the arms that open towards the viewer; one passes
  // beyond the right edge.
  for (let i = 0; i < plan.near; i++) {
    const right = i === 0;
    const arm = onPlane(1.05 + r() * 0.15, 0, i, 0.75 + r() * 0.25);
    const open: Vec = right ? [1.7, -0.3 + r() * 0.2, 0.8] : [arm[0], arm[1], 0.9 + r() * 0.3];
    add("near", pick(NEAR_JAMO), right ? 2.4 : 1.5 + r() * 0.4, scaled(open, 0.1), open, waveDelay(open, 0.18));
  }

  // Alphabet: the fourteen consonants in order, in a readable arc around the panel; everything else
  // falls back behind it. Field: a loose grid on three depth planes.
  const n = parts.length;
  const cols = Math.ceil(Math.sqrt(n * 2.2));
  const rows = Math.ceil(n / cols);
  parts.forEach((p, i) => {
    if (p.letter >= 0 && mode !== "desktop") {
      // Narrow screens: the panel fills the column, so the letters line up beneath it in two rows.
      const row = p.letter < 7 ? 0 : 1;
      p.letterAt = [((p.letter % 7) / 6 - 0.5) * 1.75, 1.4 + row * 0.3, 0.45];
    } else if (p.letter >= 0) {
      const a = Math.PI * (0.62 + (p.letter / (CONSONANTS.length - 1)) * 1.28);
      p.letterAt = [Math.cos(a) * 1.12, Math.sin(a) * 0.98 + 0.06, 0.45];
    } else {
      const a = r() * Math.PI * 2;
      p.letterAt = [Math.cos(a) * (1.25 + r() * 0.35), Math.sin(a) * (1.1 + r() * 0.3), -0.9 - r() * 0.4];
    }
    const col = i % cols;
    const row = Math.floor(i / cols);
    p.field = [
      ((col + 0.5 + (r() - 0.5) * 0.5) / cols - 0.5) * 3.6,
      ((row + 0.5 + (r() - 0.5) * 0.5) / rows - 0.5) * 1.7,
      (((i * 7) % 3) - 1) * 0.5,
    ];
  });
  return parts;
};

/** Points spread over the filled strokes of 말, in a unit square (x, y in -1..1). */
const wordPoints = (count: number, family: string, seed: number): [number, number][] => {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.font = `800 ${size * 0.86}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText("말", size / 2, size / 2 + size * 0.04);
  const data = ctx.getImageData(0, 0, size, size).data;
  const filled: [number, number][] = [];
  for (let y = 0; y < size; y += 3) {
    for (let x = 0; x < size; x += 3) {
      if (data[(y * size + x) * 4 + 3] > 140) filled.push([x / size * 2 - 1, y / size * 2 - 1]);
    }
  }
  if (filled.length < count) return filled;
  // Even spread: repeatedly take the point farthest from those already taken.
  const r = rng(seed);
  const picked: [number, number][] = [filled[Math.floor(r() * filled.length)]];
  const dist = filled.map((p) => Math.hypot(p[0] - picked[0][0], p[1] - picked[0][1]));
  while (picked.length < count) {
    let best = 0;
    for (let i = 1; i < filled.length; i++) if (dist[i] > dist[best]) best = i;
    const p = filled[best];
    picked.push(p);
    for (let i = 0; i < filled.length; i++) dist[i] = Math.min(dist[i], Math.hypot(filled[i][0] - p[0], filled[i][1] - p[1]));
  }
  return picked;
};

type Placed = StoryStop & { at: number; tx: number; ty: number; radius: number };

/** Starts the bloom and the story in `layer`, tied to the elements of `root`. Returns a stop function. */
export const startHangulStory = (layer: HTMLElement, root: HTMLElement, options: StoryOptions) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode: Mode | "" = "";
  let width = 0;
  let viewH = 0;
  let height = 0;
  let rootTop = 0;
  let shades: Shade[] = [];
  let stops: Placed[] = [];
  let parts: Part[] = [];
  let unit = 1;

  const stage = document.createElement("div");
  stage.className = "hs-stage";
  // The light inside the object.
  const glow = document.createElement("div");
  glow.className = "hs-glow";
  // The seed's own light: a small warm core that is brightest before the bloom and stays as an ember.
  const spark = document.createElement("div");
  spark.className = "hs-spark";
  const object = document.createElement("div");
  object.className = "hs-object";
  stage.append(glow, spark, object);
  layer.replaceChildren(stage);

  // Read once while the stage is in the page (reduced motion removes it).
  let fontFamily = "";
  const family = () => (fontFamily ||= getComputedStyle(object).fontFamily || "serif");

  /** Fills each part's place in the word 말 (needs the Korean font); the syllables fade instead. */
  const fillWord = (list: Part[]) => {
    const forming = list.filter((p) => p.kind !== "syllable" && p.kind !== "word");
    const points = wordPoints(forming.length, family(), options.seed + 7);
    // Bigger characters take the first, most spread-out points.
    const order = [...forming].sort((a, b) => b.size - a.size);
    order.forEach((p, i) => {
      const point = points[i % Math.max(1, points.length)] ?? [0, 0];
      p.word = [point[0], point[1]];
    });
  };

  /* Layout: viewport, stops and readability boxes. */
  const measure = () => {
    const wide = matchMedia("(min-width: 1024px)").matches;
    const mid = matchMedia("(min-width: 640px)").matches;
    const next: Mode = wide ? "desktop" : mid ? "tablet" : "mobile";
    width = root.offsetWidth;
    viewH = innerHeight;
    height = root.offsetHeight;
    rootTop = root.getBoundingClientRect().top + scrollY;
    unit = Math.min(width, viewH);
    shades = measureShades(root);
    // Base character size follows the viewport only (set here, never per frame).
    object.style.fontSize = `${Math.max(9, unit * 0.034).toFixed(1)}px`;
    if (next !== mode) {
      mode = next;
      if (!reduced) {
        for (const part of parts) part.node.remove();
        parts = buildParts(mode, options.seed, object);
        fillWord(parts);
      }
    }
    const find = (key: string) => root.querySelector<HTMLElement>(`[data-story="${key}"]`);
    stops = options.stops[mode].flatMap((stop) => {
      const el = find(stop.anchor);
      if (!el) return [];
      const box = boxIn(el, root);
      const at = Math.max(0, Math.min(height - viewH, box.top + box.height * stop.fy - viewH / 2));
      let tx = stop.x * width;
      let ty = stop.y * viewH;
      let radius = stop.size * unit;
      const target = stop.target ? find(stop.target) : null;
      if (target) {
        const t = boxIn(target, root);
        tx = t.left + t.width / 2;
        ty = t.top + t.height / 2 - at;
        if (stop.fit) radius = (t.height / 2) * stop.size;
      }
      return [{ ...stop, at, tx, ty, radius }];
    });
    stops.sort((a, b) => a.at - b.at);
  };

  /** The two stops around scroll offset `s` and the eased mix between them. */
  const storyAt = (s: number) => {
    if (s <= stops[0].at) {
      // Before the first stop the object scrolls with its block, so it never sits over the copy above it.
      const first = { ...stops[0], ty: stops[0].ty + stops[0].at - s };
      return { a: first, b: first, t: 0 };
    }
    for (let k = 0; k < stops.length - 1; k++) {
      const a = stops[k];
      const b = stops[k + 1];
      if (s <= b.at) return { a, b, t: smooth(clamp01((s - a.at) / Math.max(1, b.at - a.at))) };
    }
    const last = stops[stops.length - 1];
    return { a: last, b: last, t: 0 };
  };

  /**
   * Places every part for a mix of two stops at bloom progress `bloom` (0 seed .. 1 bloomed).
   * `time` drives only the seed's breathing and the slow drift of the open structure.
   */
  const draw = (list: Part[], a: Placed, b: Placed, t: number, bloom: number, time: number, offset: number) => {
    const cx = lerp(a.tx, b.tx, t);
    const cy = lerp(a.ty, b.ty, t);
    const radius = lerp(a.radius, b.radius, t);
    const tilt = lerp(a.tilt, b.tilt, t);
    const open = lerp(a.open, b.open, t);
    const letters = lerp(a.letters, b.letters, t);
    const field = lerp(a.field, b.field, t);
    const word = lerp(a.word, b.word, t);
    const presence = lerp(a.opacity, b.opacity, t);
    const bloomed = smooth(bloom);
    const stopLight = lerp(a.light, b.light, t);
    const light = stopLight * lerp(0.8, 1, bloomed);
    // 한글: the components gather, then the drawn syllables take over from them.
    const form = lerp(a.form, b.form, t);
    const gather = phase(bloom, 0.55, 0.82) * form;
    const fuse = phase(bloom, 0.78, 0.96) * form;
    const sculpt = Math.max(0, 1 - letters - field);
    const settle = 1 - Math.max(letters, field, word);
    // The closed seed turns slowly; once open, only a gentle sway.
    const turn = lerp(a.turn, b.turn, t) + Math.sin(time * 0.5) * lerp(0.3, 0.05, bloomed) * settle;
    const cosY = Math.cos(turn);
    const sinY = Math.sin(turn);
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);
    // Characters scale with the object, relative to the size their font was set for.
    const grow = radius / (unit * 0.27);
    const syllableAt: { x: number; y: number; px: number }[] = [];

    const resolved = phase(word, 0.7, 1);
    for (const p of list) {
      if (p.kind === "word") {
        // Sized to the teacher's character it covers: the stop's radius is half its height.
        const shown = presence * resolved;
        p.node.style.opacity = shown < 0.004 ? "0" : shown.toFixed(3);
        if (shown < 0.004) continue;
        if (p.light !== 5) {
          p.light = 5;
          p.node.dataset.l = "5";
        }
        const fit = (2 * radius) / (p.raster * unit * 0.034);
        p.node.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(fit * lerp(0.97, 1, resolved)).toFixed(3)})`;
        continue;
      }
      // Each part opens when the wave reaches it, and travels on a slight curve, not a straight line.
      const local = phase(bloom, p.delay * 0.55, p.delay * 0.55 + 0.45);
      const front = p.kind === "key" || p.kind === "syllable";
      const curl = front ? 0 : Math.sin(local * Math.PI) * 0.14;
      const drift = front ? 0 : Math.sin(time * 0.35 + p.phase) * 0.018 * bloomed;
      // Once 한글 has formed, the seed opens a little wider so the word has room to breathe.
      const lift = 1 + open * p.lift + (p.kind === "seed" ? fuse * 0.35 : 0);
      const sx = lerp(p.closed[0], p.open[0], local) * lift - p.open[1] * curl + drift;
      const sy = lerp(p.closed[1], p.open[1], local) * lift + p.open[0] * curl + drift * 0.6;
      const sz = lerp(p.closed[2], p.open[2], local) * (front ? 1 : lift);
      let x = sx * sculpt + p.letterAt[0] * letters + p.field[0] * field;
      let y = sy * sculpt + p.letterAt[1] * letters + p.field[1] * field;
      let z = sz * sculpt + p.letterAt[2] * letters + p.field[2] * field;
      // Turn around the vertical axis, then tilt towards the reader.
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      // The word 말 is flat and faces the reader.
      x = lerp(x1, p.word[0], word);
      y = lerp(y2, p.word[1], word);
      z = lerp(z2, 0.35, word);

      const persp = 3.1 / (3.1 - z);
      const depth = clamp01((z + 1.4) / 2.8);
      const asLetter = p.letter >= 0 ? lerp(1, LETTER_EM / p.size, letters) : lerp(1, 0.8, letters);
      let scale = grow * persp * (0.62 + 0.38 * depth) * asLetter * lerp(1, 0.75, word);
      let px = cx + x * radius * persp;
      let py = cy + y * radius * persp;

      if (p.kind === "syllable") syllableAt[p.syllable] = { x: px, y: py, px: p.size * scale * unit * 0.034 };
      const home = p.kind === "key" ? syllableAt[p.syllable] : undefined;
      if (home) {
        // Settle exactly where this component sits inside its syllable.
        px = lerp(px, home.x + p.inSyllable.x * home.px, gather);
        py = lerp(py, home.y + p.inSyllable.y * home.px, gather);
      }

      // Light: near the light warm, far from it navy; the nearest catch gold. Quantised so colour repaints rarely.
      const nearLight = clamp01(1 - Math.hypot(x, y, z * 0.7) / 1.15) * light;
      const asAlphabet = p.letter >= 0 ? 0.45 * letters : 0;
      const lit = p.kind === "syllable" ? 1 : clamp01(0.12 + 0.5 * depth + 0.55 * nearLight + 0.35 * word + asAlphabet);
      const level = Math.round(lit * 5);
      if (level !== p.light) {
        p.light = level;
        p.node.dataset.l = String(level);
      }
      const warm = p.kind !== "syllable" && nearLight > 0.42 && z > -0.3;
      if (warm !== p.warm) {
        p.warm = warm;
        if (warm) p.node.dataset.warm = "";
        else delete p.node.dataset.warm;
      }
      // Four depth layers, near over far; the farthest is softly blurred (CSS).
      const layerIndex = z > 0.55 ? 3 : z > 0 ? 2 : z > -0.55 ? 1 : 0;
      if (layerIndex !== p.layer) {
        p.layer = layerIndex;
        p.node.dataset.z = String(layerIndex);
      }

      // Presence: supporting jamo emerge as the wave reaches them; the keys hand over to the syllables;
      // in the alphabet everything but the letters falls back.
      let emerge = 1;
      if (p.kind === "outer" || p.kind === "near") emerge = Math.pow(local, 0.7);
      if (p.kind === "key") emerge = Math.max(local, 0.35) * (1 - fuse);
      if (p.kind === "syllable") emerge = fuse;
      if (p.kind === "seed") emerge *= lerp(1, 0.55, fuse);
      // Away from the hero, the components of 한글 step back so the structure leads.
      if (p.kind === "key") emerge *= lerp(0.55, 1, form);
      // Once 말 is drawn, the jamo that formed it stay only as a faint texture.
      emerge *= lerp(1, 0.22, resolved);
      if (p.letter < 0) emerge *= lerp(1, 0.32, letters);
      const fade = p.kind === "outer" || p.kind === "near" ? 0.1 + 0.9 * depth * depth : 0.35 + 0.65 * depth;
      const shade = shadeAt(shades, px, py + offset, unit * 0.017 * p.size * scale);
      const opacity = presence * fade * emerge * shade;
      if (opacity < 0.004) {
        p.node.style.opacity = "0";
        continue;
      }

      // Shut in the seed: turned in the plane and folded away from the reader; opening turns it to face us.
      const angle = lerp(p.closedAngle, p.openAngle, local) * settle * (p.kind === "key" ? 1 - gather : 1);
      const fold = lerp(p.closedFold, 0, local) * settle;
      if (p.kind === "syllable") scale *= lerp(0.94, 1, fuse);
      if (p.kind === "key") scale *= lerp(0.7, 1, form);
      p.node.style.opacity = opacity.toFixed(3);
      p.node.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) rotateY(${fold.toFixed(1)}deg) scale(${((scale * p.size) / p.raster).toFixed(3)})`;
    }
    return { cx, cy, radius, presence, light, stopLight, bloomed, word };
  };

  const stageTop = () => Math.max(0, Math.min(height - viewH, scrollY - rootTop));

  /* Reduced motion: still compositions placed beside their sections, fully bloomed. */
  const compose = () => {
    layer.dataset.still = "";
    stage.remove();
    layer.querySelectorAll(".hs-still").forEach((el) => el.remove());
    stops.forEach((stop, k) => {
      if (!stop.still) return;
      const group = document.createElement("div");
      group.className = "hs-still hs-object";
      group.style.fontSize = object.style.fontSize;
      layer.appendChild(group);
      const list = buildParts(mode as Mode, options.seed + k, group);
      fillWord(list);
      // Placed in page coordinates: the stop's viewport position at its own scroll offset.
      const placed = { ...stop, ty: stop.ty + stop.at };
      draw(list, placed, placed, 0, 1, 0, 0);
    });
  };

  measure();
  if (!stops.length) return () => layer.replaceChildren();

  // The word 말 needs the Korean font: re-sample once it has loaded. The bloom waits for it too
  // (briefly), so the seed is never drawn in a fallback face.
  let alive = true;
  let fontReady = false;
  const fontWait = window.setTimeout(() => (fontReady = true), 900);
  document.fonts
    ?.load(`800 100px ${family()}`, "말")
    .then(() => {
      fontReady = true;
      if (!alive) return;
      if (reduced) compose();
      else fillWord(parts);
    })
    // Without the font the word is sampled from a fallback face; nothing else depends on it.
    .catch(() => (fontReady = true));

  if (reduced) {
    compose();
    layer.dataset.ready = "";
    let pending = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        measure();
        compose();
      });
    });
    observer.observe(root);
    return () => {
      alive = false;
      clearTimeout(fontWait);
      observer.disconnect();
      cancelAnimationFrame(pending);
      layer.replaceChildren();
      delete layer.dataset.ready;
      delete layer.dataset.still;
    };
  }

  const start = performance.now();
  // The story follows the scroll with a short, soft lag so fast scrolling still glides.
  let s = stageTop();
  // Arriving further down the page (a reload, a link) skips the bloom: it belongs to the top.
  let bloom = s > viewH * 0.5 ? 1 : 0;
  let frame = 0;
  let running = false;
  let previous = start;
  let resized = 0;

  const render = (now: number) => {
    const time = (now - start) / 1000;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const offset = stageTop();
    s += (offset - s) * Math.min(1, dt * 6);
    if (Math.abs(offset - s) < 0.5) s = offset;
    // The bloom runs once on its own clock; scrolling hurries it to the end from wherever it is.
    if (bloom < 1 && fontReady) bloom = Math.min(1, bloom + dt / (offset > 4 ? BLOOM_HURRY_SECONDS : BLOOM_SECONDS));
    const { a, b, t } = storyAt(s);
    const state = draw(parts, a, b, t, bloom, time, offset);
    // The light grows from a small point as the object opens, and gathers in again behind 말.
    const size = state.radius * lerp(0.55, 1.9, state.bloomed) * (1 - state.word * 0.35);
    glow.style.transform = `translate3d(${state.cx.toFixed(1)}px, ${state.cy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(size / 600).toFixed(4)})`;
    glow.style.opacity = (state.presence * state.light).toFixed(3);
    const core = state.radius * lerp(0.5, 1.1, state.bloomed) * (1 - state.word * 0.4);
    spark.style.transform = `translate3d(${state.cx.toFixed(1)}px, ${state.cy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(core / 300).toFixed(4)})`;
    spark.style.opacity = (state.presence * state.stopLight * lerp(1, 0.45, state.bloomed) * Math.min(1, bloom * 6 + 0.3)).toFixed(3);
    frame = running ? requestAnimationFrame(render) : 0;
  };

  const play = () => {
    if (running || document.hidden) return;
    running = true;
    previous = performance.now();
    frame = requestAnimationFrame(render);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  render(start);
  layer.dataset.ready = "";
  play();

  const onResize = () => {
    clearTimeout(resized);
    resized = window.setTimeout(measure, 150);
  };
  const observer = new ResizeObserver(onResize);
  observer.observe(root);
  window.addEventListener("resize", onResize);
  const onVisibility = () => (document.hidden ? pause() : play());
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    alive = false;
    pause();
    clearTimeout(resized);
    clearTimeout(fontWait);
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    layer.replaceChildren();
    delete layer.dataset.ready;
  };
};
