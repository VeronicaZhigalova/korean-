/*
  Hangul field engine, framework-free so the Home and its review preview run
  the same code.

  Material and motion follow the Velara reference, translated to Hangul:
  each character is a translucent body with a lit rim and a soft glow, and
  glides on its own slow path through the field. Characters differ in depth,
  speed, direction, size, opacity and lifetime; they ease in, drift, swell or
  recede slightly, ease out and return elsewhere as a different character.
  About a third are placed over another character at a different depth, so
  the field overlaps and layers the way the reference plates do.

  On fine-pointer devices the pointer is a soft light: nearby characters rise
  out of the dark, their rims brighten and warm to gold, they lean a few
  pixels away, and the whole field shifts by depth (parallax). Every response
  is eased so nothing snaps to the cursor.

  One requestAnimationFrame loop per field writes transform and opacity only,
  pauses off screen and in background tabs, and never starts with reduced
  motion, which keeps the server-rendered still composition.
*/

export type FieldZone = {
  /** Spawn rectangle in % of the field. */
  x: [number, number];
  y: [number, number];
  /** Relative chance of spawning here. */
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
  x: number;
  y: number;
  /** 0 = far, 1 = near. */
  depth: number;
  peak: number;
  /** Glide in px per second (already scaled by depth). */
  vx: number;
  vy: number;
  /** Two slow sway components: amplitude px, frequency Hz, phase. */
  sway: [number, number, number, number, number, number];
  /** Scale at birth and at death: approaching or receding through space. */
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

const clamp = (value: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, value));

/** Picks a spot in a zone that keeps clear of the characters already alive. */
const clearSpot = (zone: FieldZone, r: () => number, others: Particle[]) => {
  let best = { x: 0, y: 0, gap: -1 };
  for (let attempt = 0; attempt < 10; attempt++) {
    const x = zone.x[0] + r() * (zone.x[1] - zone.x[0]);
    const y = zone.y[0] + r() * (zone.y[1] - zone.y[0]);
    const gap = others.reduce((min, o) => Math.min(min, Math.hypot(o.x - x, (o.y - y) * 0.7)), 100);
    if (gap > best.gap) best = { x, y, gap };
    if (gap > 14) break;
  }
  return best;
};

const spawn = (zones: FieldZone[], r: () => number, now: number, quiet: boolean, presence: number, others: Particle[] = []): Particle => {
  const zone = pickZone(zones, r);
  // Depth decides prominence: most are far and faint, a few come forward.
  let depth = Math.pow(r(), 1.8);
  let spot: { x: number; y: number };
  let paired = false;

  // Some characters settle over another one at a contrasting depth, so the
  // field layers like the reference plates instead of spreading out evenly.
  // Only single characters pair up; overlapping words would read as clutter.
  const inZone = others.filter(
    (o) => o.glyph.length === 1 && o.x >= zone.x[0] && o.x <= zone.x[1] && o.y >= zone.y[0] && o.y <= zone.y[1],
  );
  if (!quiet && inZone.length > 0 && r() < 0.32) {
    const partner = inZone[Math.floor(r() * inZone.length)];
    depth = partner.depth > 0.45 ? r() * 0.3 : 0.6 + r() * 0.4;
    spot = { x: clamp(partner.x + (r() - 0.5) * 7, zone.x), y: clamp(partner.y + (r() - 0.5) * 9, zone.y) };
    paired = true;
  } else {
    spot = clearSpot(zone, r, others);
  }

  const prominence = depth > 0.72 ? 1 : depth > 0.4 ? 0.62 : 0.3;
  const peak = Math.min(zone.maxOpacity, (quiet ? 0.42 : presence) * prominence + r() * 0.05);

  // Mostly lateral glides, like the reference, with every direction possible.
  const heading = (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 1.5;
  const speed = (quiet ? 1.5 + r() * 3 : 3 + r() * 6) * (0.45 + depth);
  const swell = 0.05 + r() * 0.08;
  const approaching = r() < 0.55;

  const taken = new Set(others.map((o) => o.glyph));
  let glyph = pickGlyph(r, taken);
  if (paired) while (glyph.length > 1) glyph = pickGlyph(r, taken);

  return {
    glyph,
    x: spot.x,
    y: spot.y,
    depth,
    peak,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed * 0.6,
    sway: [8 + r() * 16, 0.02 + r() * 0.035, r() * 6.3, 6 + r() * 12, 0.015 + r() * 0.03, r() * 6.3],
    zFrom: approaching ? 1 - swell : 1 + swell * 0.6,
    zTo: approaching ? 1 + swell * 0.6 : 1 - swell,
    spin: (r() - 0.5) * 7,
    born: now,
    fadeIn: 5 + r() * 4,
    hold: 6 + r() * 11,
    fadeOut: 5 + r() * 4,
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

/** The still composition: rendered on the server and kept with reduced motion. */
export const seedParticles = ({ count, zones, seed, quiet, presence }: FieldOptions) => {
  const r = rng(seed);
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const p = spawn(zones, r, 0, quiet, presence, list);
    // Start mid-life so the first frame is already composed.
    p.born = -(p.fadeIn + r() * p.hold);
    list.push(p);
  }
  return list;
};

export const glyphFontSize = (depth: number, [min, max]: [number, number]) => `${(min + (max - min) * depth).toFixed(2)}rem`;

/** Far characters sit slightly out of focus (desktop only, see CSS). */
export const glyphBlur = (depth: number) => `${Math.max(0, (0.3 - depth) * 5).toFixed(2)}px`;

/** Starts the field inside `field` (markup from seedParticles). Returns a stop function. */
export const startHangulField = (field: HTMLElement, options: FieldOptions) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const { count, countTablet, countMobile, zones, size, seed, quiet, presence } = options;
  const nodes = Array.from(field.querySelectorAll<HTMLElement>("[data-glyph]"));
  const layers = nodes.map((node) => Array.from(node.children) as HTMLElement[]);
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
  const written = nodes.map(() => ({ rim: -1, glow: -1 }));

  // Pointer light and field parallax, both eased so they trail the cursor.
  const pointer = { x: -1e4, y: -1e4, active: false, nx: 0, ny: 0 };
  const light = { x: -1e4, y: -1e4, strength: 0 };
  const view = { x: 0, y: 0 };
  const lightNode = field.querySelector<HTMLElement>("[data-light]");

  const onMove = (event: PointerEvent) => {
    const rect = field.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = pointer.x > -120 && pointer.y > -120 && pointer.x < rect.width + 120 && pointer.y < rect.height + 120;
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
    const p = spawn(zones, r, t + r() * 1.5, quiet, presence, alive);
    particles[i] = p;
    const node = nodes[i];
    for (const layer of layers[i]) layer.dataset.g = p.glyph;
    node.style.left = `${p.x}%`;
    node.style.top = `${p.y}%`;
    node.style.fontSize = glyphFontSize(p.depth, size);
    node.style.setProperty("--d", p.depth.toFixed(2));
    node.style.setProperty("--b", glyphBlur(p.depth));
    node.style.opacity = "0";
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
    light.x += (pointer.x - light.x) * ease(3.2);
    light.y += (pointer.y - light.y) * ease(3.2);
    light.strength += ((pointer.active ? 1 : 0) - light.strength) * ease(1.8);
    view.x += ((pointer.active ? pointer.nx : 0) - view.x) * ease(1.2);
    view.y += ((pointer.active ? pointer.ny : 0) - view.y) * ease(1.2);
    if (lightNode) {
      lightNode.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      lightNode.style.opacity = light.strength.toFixed(3);
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
      const span = p.fadeIn + p.hold + p.fadeOut;
      const [a1, f1, p1, a2, f2, p2] = p.sway;
      const dx = p.vx * age + a1 * Math.sin(f1 * age * 6.283 + p1);
      const dy = p.vy * age + a2 * Math.sin(f2 * age * 6.283 + p2);
      const z = p.zFrom + (p.zTo - p.zFrom) * smooth(Math.min(1, age / span));
      const breathe = 0.84 + 0.16 * Math.sin(age * 0.33 + p1);
      const rotate = p.spin * Math.sin(age * 0.07 + p2);

      let target = 0;
      let pushX = 0;
      let pushY = 0;
      if (lightable && light.strength > 0.01) {
        const cx = (p.x / 100) * width + dx;
        const cy = (p.y / 100) * height + dy;
        const ddx = cx - light.x;
        const ddy = cy - light.y;
        const dist = Math.hypot(ddx, ddy);
        const radius = quiet ? 260 : 340;
        const near = Math.max(0, 1 - dist / radius);
        target = near * near * (3 - 2 * near) * light.strength;
        // A restrained lean away from the light, stronger for near characters.
        const lean = target * (2 + p.depth * 6);
        pushX = dist > 0 ? (ddx / dist) * lean : 0;
        pushY = dist > 0 ? (ddy / dist) * lean : 0;
      }
      p.lit += (target - p.lit) * ease(2.6);
      p.push[0] += (pushX - p.push[0]) * ease(2.6);
      p.push[1] += (pushY - p.push[1]) * ease(2.6);

      // Field parallax: near characters shift further against the pointer.
      const px = -view.x * (quiet ? 6 : 14) * p.depth;
      const py = -view.y * (quiet ? 4 : 9) * p.depth;

      // The light lifts even far characters out of the dark.
      const opacity = life * Math.min(1, p.peak * breathe + p.lit * (quiet ? 0.45 : 0.75));
      node.style.opacity = opacity.toFixed(3);
      node.style.transform =
        `translate3d(${(dx + p.push[0] + px).toFixed(1)}px, ${(dy + p.push[1] + py).toFixed(1)}px, 0) ` +
        `translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${(z + p.lit * 0.05).toFixed(3)})`;

      // Rim and gold glow only repaint when they visibly change.
      const rim = Math.round((0.55 + p.lit * 0.45) * 100) / 100;
      const glow = Math.round(p.lit * 100) / 100;
      const [, rimNode, glowNode] = layers[i];
      if (rim !== written[i].rim) {
        rimNode.style.opacity = String(rim);
        written[i].rim = rim;
      }
      if (glow !== written[i].glow) {
        glowNode.style.opacity = String(glow);
        written[i].glow = glow;
      }
    }
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
