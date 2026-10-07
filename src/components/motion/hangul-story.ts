/*
  Hangul story: one sculpture made of Hangul that travels down a page with
  the scroll, framework-free so the site and its review preview run the
  same code.

  The sculpture is built like a carved object: a dense core of small jamo,
  three or four shells of larger characters (with the syllables 한 글 말 배 움)
  wrapping it at different angles with gaps between their characters, and a
  few loose fragments outside. One soft light from the upper left makes
  characters facing it warm white and those turning away navy; a few
  syllables carry gold.

  It is drawn into a viewport-sized stage pinned behind the content (CSS
  sticky, so the page scrolls normally). The page defines stops, each tied to
  an element: where the sculpture sits when that element is centred in the
  viewport, its size and tilt, and how far it has opened, regrouped into a
  ring, loosened into a field or resolved into the word 말. Between stops
  everything follows the scroll position, so scrolling back plays it back.
  Only the shells' slow drift around the core runs on its own.

  Characters dim over copy and behind glass so text always reads first. One
  requestAnimationFrame loop writes transform and opacity (and a light level
  that changes in steps); characters never change text, so scrolling causes
  no layout. With reduced motion the stops marked `still` become still
  compositions placed beside their sections.
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
  /** Tilt towards the reader, radians. */
  tilt: number;
  /** 0..1: shells lift off and characters separate. */
  open: number;
  /** 0..1 each: regroup into a ring, loosen into a field, resolve into the word 말. */
  ring: number;
  field: number;
  word: number;
  opacity: number;
  /** Shown as a still composition with reduced motion. */
  still?: boolean;
};

export type StoryOptions = {
  stops: { desktop: StoryStop[]; tablet: StoryStop[]; mobile: StoryStop[] };
  seed: number;
};

type Mode = "desktop" | "tablet" | "mobile";

/** Characters in the core, shells (count × characters each) and loose fragments. */
const BUILD: Record<Mode, { core: number; shells: number; perShell: number; fragments: number }> = {
  desktop: { core: 150, shells: 4, perShell: 24, fragments: 8 },
  tablet: { core: 96, shells: 3, perShell: 20, fragments: 6 },
  mobile: { core: 80, shells: 3, perShell: 15, fragments: 4 },
};

const JAMO = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"];
const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"];
const SYLLABLES = ["한", "글", "말", "배", "움"];

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

type Vec = [number, number, number];

const normalize = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Soft key light from the upper left, slightly towards the reader (screen y points down).
const LIGHT = normalize([-0.55, -0.6, 0.6]);

type Box = { left: number; top: number; width: number; height: number };

/** Box of `el` relative to `root`, from layout offsets (ignores reveal transforms). */
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
    if (el.closest(".hangul-story") || !el.offsetWidth) return;
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

/* The sculpture --------------------------------------------------------- */

type Part = {
  node: HTMLElement;
  kind: "core" | "shell" | "fragment";
  /** Size in em of the base size. */
  size: number;
  gold: boolean;
  /** Sculpture position (unit radius) before the shell drift. */
  base: Vec;
  /** Shell drift: axis and speed (rad/s); zero for the core. */
  axis: Vec;
  drift: number;
  /** How far it lifts when the sculpture opens. */
  lift: number;
  ring: Vec;
  field: Vec;
  /** Position in the word 말, flat, unit half-height; filled once the font is ready. */
  word: [number, number];
  light: number;
  layer: number;
};

/** Rotates v around unit axis k by angle a (Rodrigues). */
const rotate = (v: Vec, k: Vec, a: number): Vec => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c);
  const x = cross(k, v);
  return [v[0] * c + x[0] * s + k[0] * d, v[1] * c + x[1] * s + k[1] * d, v[2] * c + x[2] * s + k[2] * d];
};

const buildParts = (mode: Mode, seed: number, parent: HTMLElement) => {
  const r = rng(seed);
  const plan = BUILD[mode];
  const parts: Part[] = [];
  const add = (kind: Part["kind"], glyph: string, size: number, gold: boolean, base: Vec, axis: Vec, drift: number, lift: number) => {
    const node = document.createElement("span");
    node.className = `hs-glyph hs-${kind}${gold ? " hs-gold" : ""}`;
    node.dataset.g = glyph;
    node.style.fontSize = `${size.toFixed(2)}em`;
    node.style.opacity = "0";
    parent.appendChild(node);
    parts.push({ node, kind, size, gold, base, axis, drift, lift, ring: [0, 0, 0], field: [0, 0, 0], word: [0, 0], light: -1, layer: -1 });
  };

  // Core: small jamo packed on a sphere (Fibonacci spread), dense enough to read as solid.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < plan.core; i++) {
    const y = 1 - ((i + 0.5) / plan.core) * 2;
    const ring = Math.sqrt(1 - y * y);
    const a = i * golden;
    const rad = 0.48 + (r() - 0.5) * 0.04;
    const pool = r() < 0.7 ? JAMO : VOWELS;
    add("core", pool[Math.floor(r() * pool.length)], 0.78 + r() * 0.16, false, [Math.cos(a) * ring * rad, y * rad, Math.sin(a) * ring * rad], [0, 1, 0], 0, 0.25 + r() * 0.15);
  }

  // Shells: bands around the core at different angles; runs of characters with gaps between them,
  // covering most but not all of the circle, so they read as carved pieces, not rings of text.
  for (let s = 0; s < plan.shells; s++) {
    // Axes spread around the sphere so the bands sweep in different directions.
    const phi = (s / plan.shells) * Math.PI + r() * 0.5;
    const axis = normalize([Math.cos(phi) * 0.9, 0.35 + r() * 0.5, Math.sin(phi) * 0.9]);
    const u = normalize(cross(axis, Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]));
    const v = cross(axis, u);
    const radius = 0.86 + s * 0.12;
    const span = Math.PI * (1.25 + r() * 0.45);
    const start = r() * Math.PI * 2;
    const drift = (s % 2 ? -1 : 1) * (0.05 + r() * 0.05);
    let placed = 0;
    let k = 0;
    while (placed < plan.perShell) {
      const t = start + (k / (plan.perShell * 1.2)) * span;
      k++;
      // Gaps: every few characters one slot stays empty.
      if (k % 6 === 0 && r() < 0.85) continue;
      const c = Math.cos(t) * radius;
      const sn = Math.sin(t) * radius;
      const base: Vec = [u[0] * c + v[0] * sn, u[1] * c + v[1] * sn, u[2] * c + v[2] * sn];
      const syllable = r() < 0.2;
      const glyph = syllable ? SYLLABLES[Math.floor(r() * SYLLABLES.length)] : JAMO[Math.floor(r() * JAMO.length)];
      add("shell", glyph, syllable ? 1.1 + r() * 0.15 : 0.85 + r() * 0.15, syllable && r() < 0.22, base, axis, drift, 0.35 + r() * 0.35);
      placed++;
    }
  }

  // Fragments: single characters broken off the shells, floating just outside.
  for (let i = 0; i < plan.fragments; i++) {
    const dir = normalize([r() - 0.5, r() - 0.5, r() - 0.5]);
    const rad = 1.28 + r() * 0.22;
    const glyph = r() < 0.4 ? SYLLABLES[Math.floor(r() * SYLLABLES.length)] : JAMO[Math.floor(r() * JAMO.length)];
    add("fragment", glyph, 0.95 + r() * 0.25, r() < 0.2, [dir[0] * rad, dir[1] * rad, dir[2] * rad], normalize([r() - 0.5, 1, r() - 0.5]), 0.03 + r() * 0.03, 0.6 + r() * 0.4);
  }

  // Ring and field targets. The field is a loose grid on three depth planes, so it stays spatial and ordered.
  const n = parts.length;
  const cols = Math.ceil(Math.sqrt(n * 2.2));
  const rows = Math.ceil(n / cols);
  parts.forEach((p, i) => {
    const a = (i / n) * Math.PI * 2 * 3 + (r() - 0.5) * 0.08;
    const band = (i % 3) - 1;
    const rr = 1.05 + band * 0.12 + (r() - 0.5) * 0.06;
    p.ring = [Math.cos(a) * rr, band * 0.05 + (r() - 0.5) * 0.05, Math.sin(a) * rr];
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

/** Starts the story in `layer`, tied to the elements of `root`. Returns a stop function. */
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
  const rings = document.createElement("div");
  rings.className = "hs-rings";
  rings.innerHTML = "<span></span><span></span><span></span>";
  const object = document.createElement("div");
  object.className = "hs-object";
  stage.append(rings, object);
  layer.replaceChildren(stage);

  // Read once while the stage is in the page (reduced motion removes it).
  let fontFamily = "";
  const family = () => (fontFamily ||= getComputedStyle(object).fontFamily || "serif");

  /** Fills each part's place in the word 말 (needs the Korean font). */
  const fillWord = (list: Part[]) => {
    const points = wordPoints(list.length, family(), options.seed + 7);
    // Bigger characters take the first, most spread-out points.
    const order = [...list].sort((a, b) => b.size - a.size);
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
      // Before the first stop the sculpture scrolls with its block, so it never sits over the copy above it.
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

  /** Places every part for a mix of two stops; `spin` turns the sculpture, `time` drives the shells' drift. */
  const draw = (list: Part[], a: Placed, b: Placed, t: number, spin: number, time: number, offset: number) => {
    const cx = lerp(a.tx, b.tx, t);
    const cy = lerp(a.ty, b.ty, t);
    const radius = lerp(a.radius, b.radius, t);
    const tilt = lerp(a.tilt, b.tilt, t);
    const open = lerp(a.open, b.open, t);
    const ring = lerp(a.ring, b.ring, t);
    const field = lerp(a.field, b.field, t);
    const word = lerp(a.word, b.word, t);
    const presence = lerp(a.opacity, b.opacity, t);
    const sculpt = Math.max(0, 1 - ring - field);
    const cosY = Math.cos(spin);
    const sinY = Math.sin(spin);
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);
    // Characters scale with the sculpture, relative to the size their font was set for.
    const grow = radius / (unit * 0.27);

    for (const p of list) {
      // Sculpture: shells drift around their own axes; opening lifts everything outwards unevenly.
      const drifted = p.drift ? rotate(p.base, p.axis, time * p.drift) : p.base;
      const lift = 1 + open * p.lift;
      let x = drifted[0] * lift * sculpt + p.ring[0] * ring + p.field[0] * field;
      let y = drifted[1] * lift * sculpt + p.ring[1] * ring + p.field[1] * field;
      let z = drifted[2] * lift * sculpt + p.ring[2] * ring + p.field[2] * field;
      // Turn with the scroll around the vertical axis, then tilt towards the reader.
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      x = x1;
      y = y2;
      z = z2;
      // The word 말 is flat and faces the reader.
      x = lerp(x, p.word[0], word);
      y = lerp(y, p.word[1], word);
      z = lerp(z, 0.35, word);
      const persp = 3.4 / (3.4 - z);
      // Shell characters follow their band like letters on a ribbon (kept upright-ish), upright again as the form changes.
      let angle = 0;
      if (p.kind === "shell" && sculpt > 0 && word < 1) {
        const tg = cross(p.axis, drifted);
        const tx1 = tg[0] * cosY + tg[2] * sinY;
        const tz1 = -tg[0] * sinY + tg[2] * cosY;
        const ty2 = tg[1] * cosX - tz1 * sinX;
        let deg = (Math.atan2(ty2, tx1) * 180) / Math.PI;
        if (deg > 90) deg -= 180;
        else if (deg < -90) deg += 180;
        angle = deg * sculpt * (1 - word) * 0.85;
      }
      const px = cx + x * radius * persp;
      const py = cy + y * radius * persp;

      // Light: facing the upper-left light = warm white, turned away = navy; quantised so colour repaints rarely.
      const len = Math.hypot(x, y, z) || 1;
      const facing = (x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]) / len;
      const lit = lerp(clamp01(0.5 + facing * 0.65), 0.85, word);
      const level = Math.round(lit * 5);
      if (level !== p.light) {
        p.light = level;
        p.node.dataset.l = String(level);
      }
      // Front, middle and back: the near half paints over the far half.
      const layerIndex = z > 0.3 ? 2 : z > -0.3 ? 1 : 0;
      if (layerIndex !== p.layer) {
        p.layer = layerIndex;
        p.node.dataset.z = String(layerIndex);
      }

      const depth = clamp01((z + 1.4) / 2.8);
      const scale = grow * persp * (0.7 + 0.3 * depth) * lerp(1, 0.75, word);
      const shade = shadeAt(shades, px, py + offset, unit * 0.017 * p.size * scale);
      const opacity = presence * (0.25 + 0.75 * depth) * shade;
      p.node.style.opacity = opacity.toFixed(3);
      p.node.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    }
    return { cx, cy, radius, presence, open, field };
  };

  const stageTop = () => Math.max(0, Math.min(height - viewH, scrollY - rootTop));

  /* Reduced motion: still compositions placed beside their sections. */
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
      draw(list, { ...stop, ty: stop.ty + stop.at }, { ...stop, ty: stop.ty + stop.at }, 0, 0.7 + k * 0.6, 0, 0);
    });
  };

  measure();
  if (!stops.length) return () => layer.replaceChildren();

  // The word 말 needs the Korean font: re-sample once it has loaded.
  let alive = true;
  document.fonts
    ?.load(`800 100px ${family()}`, "말")
    .then(() => {
      if (!alive) return;
      if (reduced) compose();
      else fillWord(parts);
    })
    // Without the font the word is sampled from a fallback face; nothing else depends on it.
    .catch(() => {});

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
    const { a, b, t } = storyAt(s);
    // About a quarter turn per section, from the scroll alone.
    const spin = -0.5 + s * 0.0013;
    const state = draw(parts, a, b, t, spin, time, offset);
    // Hairline rings centred on the sculpture; they fade as it loosens into the field.
    rings.style.transform = `translate3d(${state.cx.toFixed(1)}px, ${state.cy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${((state.radius * 1.55) / 600).toFixed(4)})`;
    rings.style.opacity = (state.presence * (1 - state.field) * 0.9).toFixed(3);
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
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    layer.replaceChildren();
    delete layer.dataset.ready;
  };
};
