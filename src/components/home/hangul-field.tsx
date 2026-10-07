"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/*
  A living field of Hangul. Each character drifts on its own path (a slow
  drift plus two incommensurate sine wobbles, so nothing visibly loops),
  fades in, breathes brighter and dimmer, fades out and returns somewhere
  else as a different character. The pointer acts as a soft light: nearby
  characters brighten, warm to gold and lean a few pixels away.

  One requestAnimationFrame loop per field writes transform and opacity
  directly to the DOM (no React state), pauses off screen, and never starts
  with reduced motion, which keeps the server-rendered still composition.
  Decorative and aria-hidden.
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

type Props = {
  count: number;
  /** Fewer characters below 1024 px and below 640 px. */
  countTablet?: number;
  countMobile?: number;
  zones: FieldZone[];
  /** Size range in rem, from far to near. */
  size?: [number, number];
  /** Deterministic seed so the server and first client render agree. */
  seed: number;
  /** Section fields are quieter versions of the hero. */
  quiet?: boolean;
  /** Peak opacity of the most prominent characters (hero default 0.58). */
  presence?: number;
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

type Particle = {
  glyph: string;
  x: number;
  y: number;
  /** 0 = far, 1 = near. */
  depth: number;
  peak: number;
  vx: number;
  vy: number;
  wobble: [number, number, number, number, number, number];
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

/** Picks a spot in a zone that keeps clear of the characters already alive. */
const pickSpot = (zone: FieldZone, r: () => number, others: Particle[]) => {
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

const spawn = (zones: FieldZone[], r: () => number, now: number, quiet: boolean, others: Particle[] = [], presence = 0.58): Particle => {
  const zone = pickZone(zones, r);
  // Depth decides prominence: most are far and faint, a few come forward.
  const depth = Math.pow(r(), 2);
  const prominence = depth > 0.75 ? 1 : depth > 0.4 ? 0.5 : 0.2;
  const peak = Math.min(zone.maxOpacity, (quiet ? 0.3 : presence) * prominence + r() * 0.05);
  const spot = pickSpot(zone, r, others);
  return {
    glyph: pickGlyph(r, new Set(others.map((o) => o.glyph))),
    x: spot.x,
    y: spot.y,
    depth,
    peak,
    vx: (r() - 0.5) * 0.5,
    vy: (r() - 0.5) * 0.4 - 0.08,
    wobble: [0.6 + r() * 1.6, 0.05 + r() * 0.08, r() * 6.3, 0.4 + r() * 1.2, 0.03 + r() * 0.06, r() * 6.3],
    spin: (r() - 0.5) * 10,
    born: now,
    fadeIn: 4 + r() * 4,
    hold: 7 + r() * 12,
    fadeOut: 4 + r() * 5,
    lit: 0,
    push: [0, 0],
  };
};

const lifeOpacity = (p: Particle, t: number) => {
  const age = t - p.born;
  const smooth = (v: number) => v * v * (3 - 2 * v);
  if (age < p.fadeIn) return smooth(age / p.fadeIn);
  if (age < p.fadeIn + p.hold) return 1;
  const out = (age - p.fadeIn - p.hold) / p.fadeOut;
  return out >= 1 ? -1 : 1 - smooth(out);
};

const initial = (count: number, zones: FieldZone[], seed: number, quiet: boolean, presence?: number) => {
  const r = rng(seed);
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const p = spawn(zones, r, 0, quiet, list, presence);
    // Start mid-life so the still frame (and reduced motion) is already composed.
    p.born = -(p.fadeIn + r() * p.hold);
    list.push(p);
  }
  return list;
};

const fontSize = (depth: number, [min, max]: [number, number]) => `${(min + (max - min) * depth).toFixed(2)}rem`;

export const HangulField = ({ count, countTablet, countMobile, zones, size = [1.2, 5.5], seed, quiet = false, presence }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = initial(count, zones, seed, quiet, presence);

  useEffect(() => {
    const field = ref.current;
    if (!field || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(field.querySelectorAll<HTMLElement>("[data-glyph]"));
    const limit = matchMedia("(min-width: 1024px)").matches
      ? count
      : matchMedia("(min-width: 640px)").matches
        ? (countTablet ?? count)
        : (countMobile ?? countTablet ?? count);

    const r = rng(seed ^ Math.floor(Math.random() * 1e9));
    const particles = initial(count, zones, seed, quiet, presence);
    const lightable = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 640px)").matches;

    // Pointer light, eased so it trails the cursor with a little inertia.
    const pointer = { x: -1e4, y: -1e4, active: false };
    const light = { x: -1e4, y: -1e4, strength: 0 };
    const lightNode = field.querySelector<HTMLElement>("[data-light]");

    const onMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.x > -80 && pointer.y > -80 && pointer.x < rect.width + 80 && pointer.y < rect.height + 80;
      if (light.x < -1e3) {
        light.x = pointer.x;
        light.y = pointer.y;
      }
    };
    const onLeave = () => {
      pointer.active = false;
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

      light.x += (pointer.x - light.x) * Math.min(1, dt * 4);
      light.y += (pointer.y - light.y) * Math.min(1, dt * 4);
      light.strength += ((pointer.active ? 1 : 0) - light.strength) * Math.min(1, dt * 2.2);
      if (lightNode) {
        lightNode.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        lightNode.style.opacity = light.strength.toFixed(3);
      }

      for (let i = 0; i < limit; i++) {
        const p = particles[i];
        const node = nodes[i];
        let life = lifeOpacity(p, t);
        if (life < 0) {
          // Return somewhere else, as a different character.
          particles[i] = spawn(zones, r, t + r() * 3, quiet, particles.slice(0, limit).filter((_, j) => j !== i), presence);
          (node.firstElementChild as HTMLElement).dataset.g = particles[i].glyph;
          (node.lastElementChild as HTMLElement).dataset.g = particles[i].glyph;
          node.style.left = `${particles[i].x}%`;
          node.style.top = `${particles[i].y}%`;
          node.style.fontSize = fontSize(particles[i].depth, size);
          node.style.opacity = "0";
          continue;
        }
        if (t < p.born) life = 0;

        const age = Math.max(0, t - p.born);
        const [a1, f1, p1, a2, f2, p2] = p.wobble;
        // Drift scaled by depth: near characters travel further (parallax).
        const travel = 0.45 + p.depth;
        const dx = (p.vx * age + a1 * Math.sin(f1 * age * 6.28 + p1)) * travel * 6;
        const dy = (p.vy * age + a2 * Math.sin(f2 * age * 6.28 + p2)) * travel * 6;
        const breathe = 0.82 + 0.18 * Math.sin(age * 0.37 + p1);
        const scale = 1 + 0.05 * Math.sin(age * 0.21 + p2);
        const rotate = p.spin * Math.sin(age * 0.09 + p1);

        let target = 0;
        let pushX = 0;
        let pushY = 0;
        if (lightable && light.strength > 0.01) {
          const cx = (p.x / 100) * width + dx;
          const cy = (p.y / 100) * height + dy;
          const ddx = cx - light.x;
          const ddy = cy - light.y;
          const dist = Math.hypot(ddx, ddy);
          const radius = 320;
          const near = Math.max(0, 1 - dist / radius);
          target = near * near * light.strength;
          // A restrained lean away from the light, stronger for near characters.
          const lean = target * (4 + p.depth * 8);
          pushX = dist > 0 ? (ddx / dist) * lean : 0;
          pushY = dist > 0 ? (ddy / dist) * lean : 0;
        }
        p.lit += (target - p.lit) * Math.min(1, dt * 3);
        p.push[0] += (pushX - p.push[0]) * Math.min(1, dt * 3);
        p.push[1] += (pushY - p.push[1]) * Math.min(1, dt * 3);

        // The pointer can lift even far characters out of the dark.
        const base = p.peak * breathe;
        const opacity = life * Math.min(1, base + p.lit * (quiet ? 0.5 : 0.9));
        node.style.opacity = opacity.toFixed(3);
        node.style.transform =
          `translate3d(${(dx + p.push[0]).toFixed(1)}px, ${(dy + p.push[1]).toFixed(1)}px, 0) ` +
          `translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${(scale + p.lit * 0.06).toFixed(3)})`;
        (node.lastElementChild as HTMLElement).style.opacity = p.lit.toFixed(3);
      }
      frame = running ? requestAnimationFrame(render) : 0;
    };

    const play = () => {
      if (running) return;
      running = true;
      previous = performance.now();
      frame = requestAnimationFrame(render);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()));
    visibility.observe(field);
    const onVisibility = () => (document.hidden ? pause() : visibility.takeRecords());
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
  }, [count, countTablet, countMobile, zones, size, seed, quiet, presence]);

  return (
    <div ref={ref} className={quiet ? "hangul-field hangul-field-quiet" : "hangul-field"} aria-hidden="true">
      <div data-light className="hf-light" />
      {seeded.map((p, index) => (
        <span
          key={index}
          data-glyph
          lang="ko"
          className={
            index >= (countMobile ?? countTablet ?? count)
              ? index >= (countTablet ?? count)
                ? "hf-glyph hf-desktop-only"
                : "hf-glyph hf-no-phone"
              : "hf-glyph"
          }
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: fontSize(p.depth, size),
              opacity: p.peak.toFixed(3),
              "--d": p.depth.toFixed(2),
            } as CSSProperties
          }
        >
          {/* Glyphs render through ::before so the decoration carries no text content. */}
          <span className="hf-ink" data-g={p.glyph} />
          <span className="hf-glow" data-g={p.glyph} />
        </span>
      ))}
    </div>
  );
};
