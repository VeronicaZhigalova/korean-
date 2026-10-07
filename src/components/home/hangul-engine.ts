/*
  Hangul field engine, framework-free so the Home and its review preview run
  the same code.

  Motion follows the Velara reference's entrance and exit, made organic:
  each character floats in from its own edge of the field at low opacity,
  glides slowly across on its own path, depth and speed, stays for a while,
  then drifts on and fades away while another appears somewhere else.
  Lifetimes, delays and paths all differ, so nothing moves together and no
  loop repeats. Near characters travel further than far ones, and paths
  cross, so characters overlap at different depths as they pass.

  Quiet fields (outside the hero) use the same lifecycle with only a short,
  gentle drift.

  On fine-pointer devices the pointer is a secondary, soft light: nearby
  characters brighten a little and pick up a gold glow, lean a few pixels
  away, and the field shifts slightly by depth. All of it is eased.

  One requestAnimationFrame loop per field writes transform and opacity only,
  pauses off screen and in background tabs, and never starts with reduced
  motion, which keeps the server-rendered still composition.
*/

export type FieldZone = {
  /** Area in % of the field where characters travel. */
  x: [number, number];
  y: [number, number];
  /** Relative chance of a character travelling here. */
  weight: number;
  /** Opacity ceiling, kept low where the zone sits behind copy. */
  maxOpacity: number;
};

export type FieldOptions = {
  count: number;
  /** Fewer characters below 1024 px and below 640 px. */
  countTablet?: number;
  countMobile?: number;
  zones: FieldZone[];
  /** Size range in rem, from far to near. */
  size: [number, number];
  /** Deterministic seed so the server and first client render agree. */
  seed: number;
  /** Section fields are quieter versions of the hero. */
  quiet: boolean;
  /** Peak opacity of the most prominent characters. */
  presence: number;
};

// Mostly single syllables and jamo; a few short words for meaning, used sparingly.
const GLYPHS = [
  "말", "한", "글", "나", "너", "꿈", "빛", "길", "봄", "별", "숨", "결", "물", "꽃", "눈", "달",
  "가", "다", "마", "사", "ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅁ", "ㅇ", "ㅅ", "ㅗ",
];
const WORDS = ["소리", "마음", "우리", "하늘", "사랑", "배움"];

/* Small seeded PRNG (mulberry32): same output on server and client. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Particle = {
  glyph: string;
  /** Start of the path, in % of the field. */
  x: number;
  y: number;
  /** Whole journey, in % of the field. */
  travelX: number;
  travelY: number;
  /** 0 = far, 1 = near. */
  depth: number;
  peak: number;
  /** Slow sway across the path: amplitude px, frequency Hz, phase. */
  sway: [number, number, number];
  /** Scale at the start and end of the journey: approaching or receding. */
  zFrom: number;
  zTo: number;
  spin: number;
  /** Seconds: when it was born, fade-in, hold, fade-out. */
  born: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  /** Eased pointer response. */
  lit: number;
  push: [number, number];
};

const pickZone = (zones: FieldZone[], r: () => number) => {
  const total = zones.reduce((sum, zone) => sum + zone.weight, 0);
  let roll = r() * total;
  for (const zone of zones) {
    roll -= zone.weight;
    if (roll <= 0) return zone;
  }
  return zones[zones.length - 1];
};

const pickGlyph = (r: () => number, taken: Set<string>) => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const pool = r() < 0.12 ? WORDS : GLYPHS;
    const glyph = pool[Math.floor(r() * pool.length)];
    if (!taken.has(glyph)) return glyph;
  }
  return GLYPHS[Math.floor(r() * GLYPHS.length)];
};

const lerp = ([min, max]: [number, number], t: number) => min + (max - min) * t;

/**
 * A journey through the zone: enter at one edge, cross part of it, leave.
 * Mostly lateral like the reference, but any edge can be the way in.
 */
const pickPath = (zone: FieldZone, r: () => number, quiet: boolean, depth: number) => {
  if (quiet) {
    // Short, calm drift in place.
    const angle = r() * Math.PI * 2;
    const reach = 2 + r() * 4;
    return { x: lerp(zone.x, r()), y: lerp(zone.y, r()), travelX: Math.cos(angle) * reach, travelY: Math.sin(angle) * reach * 0.7 };
  }

  const width = zone.x[1] - zone.x[0];
  const height = zone.y[1] - zone.y[0];
  // Near characters cross more of the field than far ones (parallax).
  const reach = 0.35 + r() * 0.3 + depth * 0.25;
  const side = r();
  let x: number;
  let y: number;
  let angle: number;
  if (side < 0.36) {
    // From the right edge, drifting left.
    x = zone.x[1] + r() * 4;
    y = lerp(zone.y, 0.1 + r() * 0.8);
    angle = Math.PI + (r() - 0.5) * 0.9;
  } else if (side < 0.58) {
    // From the left of the zone, drifting right.
    x = zone.x[0] - r() * 3;
    y = lerp(zone.y, 0.1 + r() * 0.8);
    angle = (r() - 0.5) * 0.9;
  } else if (side < 0.82) {
    // Rising from below.
    x = lerp(zone.x, 0.1 + r() * 0.8);
    y = zone.y[1] + r() * 4;
    angle = -Math.PI / 2 + (r() - 0.5) * 1.1;
  } else {
    // Settling from above.
    x = lerp(zone.x, 0.1 + r() * 0.8);
    y = zone.y[0] - r() * 4;
    angle = Math.PI / 2 + (r() - 0.5) * 1.1;
  }
  const span = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
  return { x, y, travelX: Math.cos(angle) * span * reach, travelY: Math.sin(angle) * span * reach };
};

/**
 * Each slot keeps a depth band, so the field always holds a few near, some
 * middle and many far characters however their lifetimes fall.
 */
const DEPTH_BANDS: [number, number][] = [
  [0.76, 1],
  [0.42, 0.74],
  [0.42, 0.74],
  [0, 0.38],
  [0, 0.38],
];

const spawn = (zones: FieldZone[], r: () => number, now: number, quiet: boolean, presence: number, slot: number, others: Particle[] = []): Particle => {
  const zone = pickZone(zones, r);
  // Depth decides prominence: near characters are brighter and larger.
  const band = DEPTH_BANDS[slot % DEPTH_BANDS.length];
  const depth = band[0] + r() * (band[1] - band[0]);
  const prominence = depth > 0.75 ? 1 : depth > 0.4 ? 0.5 : 0.2;
  const peak = Math.min(zone.maxOpacity, (quiet ? 0.3 : presence) * prominence + r() * 0.05);
  const path = pickPath(zone, r, quiet, depth);
  const swell = 0.04 + r() * 0.06;
  const approaching = r() < 0.55;

  return {
    glyph: pickGlyph(r, new Set(others.map((o) => o.glyph))),
    ...path,
    depth,
    peak,
    sway: [4 + r() * 10, 0.015 + r() * 0.03, r() * 6.3],
    zFrom: approaching ? 1 - swell : 1 + swell * 0.5,
    zTo: approaching ? 1 + swell * 0.5 : 1 - swell,
    spin: (r() - 0.5) * 6,
    born: now,
    fadeIn: quiet ? 4 + r() * 4 : 5 + r() * 4,
    hold: quiet ? 7 + r() * 12 : 9 + r() * 12,
    fadeOut: quiet ? 4 + r() * 5 : 6 + r() * 4,
    lit: 0,
    push: [0, 0],
  };
};

const smooth = (v: number) => v * v * (3 - 2 * v);

/** 0..1 through the fade-in, 1 while held, 1..0 through the fade-out, -1 when gone. */
const lifeOpacity = (p: Particle, t: number) => {
  const age = t - p.born;
  if (age < p.fadeIn) return smooth(Math.max(0, age / p.fadeIn));
  if (age < p.fadeIn + p.hold) return 1;
  const out = (age - p.fadeIn - p.hold) / p.fadeOut;
  return out >= 1 ? -1 : 1 - smooth(out);
};

/**
 * Progress along the path: a steady glide that eases in on arrival and eases
 * out on departure but never stops.
 */
const journey = (p: Particle, t: number) => {
  const u = Math.min(1, Math.max(0, (t - p.born) / (p.fadeIn + p.hold + p.fadeOut)));
  return 0.55 * u + 0.45 * (0.5 - 0.5 * Math.cos(u * Math.PI));
};

/** Where a character sits at time t, in % of the field (server still frame). */
export const positionAt = (p: Particle, t: number) => {
  const k = journey(p, t);
  return { x: p.x + p.travelX * k, y: p.y + p.travelY * k };
};

/** The still composition: rendered on the server and kept with reduced motion. */
export const seedParticles = ({ count, zones, seed, quiet, presence }: FieldOptions) => {
  const r = rng(seed);
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const p = spawn(zones, r, 0, quiet, presence, i, list);
    // Start part-way through the held stretch so the first frame is composed and
    // fully visible; a varied extra stay spreads the first departures out in time.
    p.hold += r() * 18;
    p.born = -(p.fadeIn + r() * p.hold * 0.6);
    list.push(p);
  }
  return list;
};

export const glyphFontSize = (depth: number, [min, max]: [number, number]) => `${(min + (max - min) * depth).toFixed(2)}rem`;

/** Starts the field inside `field` (markup from seedParticles). Returns a stop function. */
export const startHangulField = (field: HTMLElement, options: FieldOptions) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const { count, countTablet, countMobile, zones, size, seed, quiet, presence } = options;
  const nodes = Array.from(field.querySelectorAll<HTMLElement>("[data-glyph]"));
  const glows = nodes.map((node) => node.lastElementChild as HTMLElement);
  const limit = Math.min(
    nodes.length,
    matchMedia("(min-width: 1024px)").matches
      ? count
      : matchMedia("(min-width: 640px)").matches
        ? (countTablet ?? count)
        : (countMobile ?? countTablet ?? count),
  );

  const r = rng(seed ^ Math.floor(Math.random() * 1e9));
  const particles = seedParticles(options);
  const lightable = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 640px)").matches;
  const glowWritten = nodes.map(() => -1);

  // The engine positions by the start of each path; transforms carry the journey.
  const place = (i: number) => {
    const p = particles[i];
    nodes[i].style.left = `${p.x}%`;
    nodes[i].style.top = `${p.y}%`;
    nodes[i].style.fontSize = glyphFontSize(p.depth, size);
  };
  for (let i = 0; i < limit; i++) place(i);

  // Pointer light and a slight field parallax, both eased so they trail the cursor.
  const pointer = { x: -1e4, y: -1e4, active: false, nx: 0, ny: 0 };
  const light = { x: -1e4, y: -1e4, strength: 0 };
  const view = { x: 0, y: 0 };
  const lightNode = field.querySelector<HTMLElement>("[data-light]");

  const onMove = (event: PointerEvent) => {
    const rect = field.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = pointer.x > -80 && pointer.y > -80 && pointer.x < rect.width + 80 && pointer.y < rect.height + 80;
    pointer.nx = Math.max(-1, Math.min(1, (pointer.x / rect.width) * 2 - 1));
    pointer.ny = Math.max(-1, Math.min(1, (pointer.y / rect.height) * 2 - 1));
    if (light.x < -1e3) {
      light.x = pointer.x;
      light.y = pointer.y;
    }
  };
  const onLeave = () => {
    pointer.active = false;
  };

  const respawn = (i: number, t: number) => {
    const alive = particles.slice(0, limit).filter((_, j) => j !== i);
    // A short, varied pause before the next character arrives.
    particles[i] = spawn(zones, r, t + 0.5 + r() * 2.5, quiet, presence, i, alive);
    const node = nodes[i];
    (node.firstElementChild as HTMLElement).dataset.g = particles[i].glyph;
    glows[i].dataset.g = particles[i].glyph;
    node.style.opacity = "0";
    place(i);
  };

  let frame = 0;
  let running = false;
  const start = performance.now();
  let previous = start;

  const render = (now: number) => {
    const t = (now - start) / 1000;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const { width, height } = field.getBoundingClientRect();

    const ease = (rate: number) => Math.min(1, dt * rate);
    light.x += (pointer.x - light.x) * ease(3);
    light.y += (pointer.y - light.y) * ease(3);
    light.strength += ((pointer.active ? 1 : 0) - light.strength) * ease(1.8);
    view.x += ((pointer.active ? pointer.nx : 0) - view.x) * ease(1.2);
    view.y += ((pointer.active ? pointer.ny : 0) - view.y) * ease(1.2);
    if (lightNode) {
      lightNode.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      lightNode.style.opacity = (light.strength * 0.8).toFixed(3);
    }

    for (let i = 0; i < limit; i++) {
      const p = particles[i];
      const node = nodes[i];
      let life = lifeOpacity(p, t);
      if (life < 0) {
        respawn(i, t);
        continue;
      }
      if (t < p.born) life = 0;

      const age = Math.max(0, t - p.born);
      const k = journey(p, t);
      const [amp, freq, phase] = p.sway;
      // Sway runs across the path so the glide never looks ruled.
      const sway = amp * Math.sin(freq * age * 6.283 + phase);
      const length = Math.hypot(p.travelX, p.travelY) || 1;
      const dx = (p.travelX * k * width) / 100 + (-p.travelY / length) * sway;
      const dy = (p.travelY * k * height) / 100 + (p.travelX / length) * sway;
      const z = p.zFrom + (p.zTo - p.zFrom) * k;
      const breathe = 0.86 + 0.14 * Math.sin(age * 0.31 + phase);
      const rotate = p.spin * Math.sin(age * 0.06 + phase);

      let target = 0;
      let pushX = 0;
      let pushY = 0;
      if (lightable && light.strength > 0.01) {
        const cx = (p.x / 100) * width + dx;
        const cy = (p.y / 100) * height + dy;
        const ddx = cx - light.x;
        const ddy = cy - light.y;
        const dist = Math.hypot(ddx, ddy);
        const near = Math.max(0, 1 - dist / 300);
        target = near * near * light.strength;
        // A very small lean away from the light, stronger for near characters.
        const lean = target * (2 + p.depth * 4);
        pushX = dist > 0 ? (ddx / dist) * lean : 0;
        pushY = dist > 0 ? (ddy / dist) * lean : 0;
      }
      p.lit += (target - p.lit) * ease(2.5);
      p.push[0] += (pushX - p.push[0]) * ease(2.5);
      p.push[1] += (pushY - p.push[1]) * ease(2.5);

      // Slight field parallax: near characters shift a little against the pointer.
      const px = -view.x * (quiet ? 3 : 6) * p.depth;
      const py = -view.y * (quiet ? 2 : 4) * p.depth;

      const opacity = life * Math.min(1, p.peak * breathe + p.lit * (quiet ? 0.3 : 0.45));
      node.style.opacity = opacity.toFixed(3);
      node.style.transform =
        `translate3d(${(dx + p.push[0] + px).toFixed(1)}px, ${(dy + p.push[1] + py).toFixed(1)}px, 0) ` +
        `translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${(z + p.lit * 0.04).toFixed(3)})`;

      // The gold glow only repaints when it visibly changes.
      const glow = Math.round(p.lit * 100) / 100;
      if (glow !== glowWritten[i]) {
        glows[i].style.opacity = String(glow);
        glowWritten[i] = glow;
      }
    }
    frame = running ? requestAnimationFrame(render) : 0;
  };
  // Paint the first frame now, so moving to path-start positions never shows.
  render(start);

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

  let onScreen = false;
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) play();
    else pause();
  });
  visibility.observe(field);
  const onVisibility = () => (document.hidden ? pause() : onScreen && play());
  document.addEventListener("visibilitychange", onVisibility);

  if (lightable) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  return () => {
    pause();
    visibility.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
};
