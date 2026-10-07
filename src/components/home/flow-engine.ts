/*
  Hangul flow engine: one visual current that runs through the whole Home,
  framework-free so the site and its review preview run the same code.

  The route is a list of points pinned to page elements (sections, cards,
  panels). It is measured from the live layout, smoothed into one curve, and
  drawn as a soft band with a thin gold line that draws itself downward as
  the reader scrolls. Hangul characters emerge near the curve, travel
  downstream at their own speed, depth and distance from it, then fade out
  while new ones appear further on. Each route point carries a width and an
  intensity, so the current widens in open space and quietens behind copy.

  Only the stretch around the viewport animates: characters are spawned there
  and recycled when the reader scrolls away. One requestAnimationFrame loop
  writes transform and opacity only; it pauses in background tabs. With
  reduced motion the band, the line and characters placed along the whole
  route form a still composition.
*/

/** [element key (data-flow), x and y as fractions of its box, band width, intensity 0..1] */
export type FlowPoint = [key: string, x: number, y: number, width: number, intensity: number];

export type FlowOptions = {
  routes: { desktop: FlowPoint[]; tablet: FlowPoint[]; mobile: FlowPoint[] };
  seed: number;
};

type Profile = {
  /** Characters on screen at once. */
  count: number;
  /** Size range in rem, from far to near. */
  size: [number, number];
  /** Half width of the band at width 1, in px. */
  band: number;
  /** Spacing of the still composition along the route, in px. */
  spacing: number;
  /** How strongly spawning favours intense stretches (higher = more selective). */
  focus: number;
  /** Peak opacity of the nearest characters. */
  presence: number;
};

const PROFILES: Record<"desktop" | "tablet" | "mobile", Profile> = {
  desktop: { count: 24, size: [1.1, 4.6], band: 92, spacing: 190, focus: 1.3, presence: 0.62 },
  tablet: { count: 16, size: [1.05, 3.6], band: 64, spacing: 160, focus: 0.9, presence: 0.7 },
  mobile: { count: 12, size: [1, 2.9], band: 46, spacing: 130, focus: 0.8, presence: 0.78 },
};

// Mostly single syllables and jamo; a few short words for meaning, used sparingly.
const GLYPHS = [
  "말", "한", "글", "나", "너", "꿈", "빛", "길", "봄", "별", "숨", "결", "물", "꽃", "눈", "달",
  "가", "다", "마", "사", "ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅁ", "ㅇ", "ㅅ", "ㅗ",
];
const WORDS = ["소리", "마음", "우리", "하늘", "사랑", "배움"];

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

/* Route geometry ------------------------------------------------------- */

const STEP = 6; // px between route samples

type Route = {
  x: Float32Array;
  y: Float32Array;
  /** Unit normal. */
  nx: Float32Array;
  ny: Float32Array;
  width: Float32Array;
  intensity: Float32Array;
  /** Running maximum of y, for finding how far the reader has reached. */
  reach: Float32Array;
  length: number;
  stops: { y: number; intensity: number }[];
};

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
    // offsetParent chain skipped the root (it is not positioned): fall back to rects.
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight };
};

/** Centripetal Catmull-Rom through the points, resampled every STEP px. */
const buildRoute = (points: { x: number; y: number; w: number; i: number }[]): Route | null => {
  if (points.length < 2) return null;
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const before = points[points.length - 2];
  const ctrl = [
    { ...first, x: 2 * first.x - second.x, y: 2 * first.y - second.y },
    ...points,
    { ...last, x: 2 * last.x - before.x, y: 2 * last.y - before.y },
  ];

  const raw: { x: number; y: number; w: number; i: number }[] = [];
  for (let s = 1; s < ctrl.length - 2; s++) {
    const [p0, p1, p2, p3] = [ctrl[s - 1], ctrl[s], ctrl[s + 1], ctrl[s + 2]];
    const knot = (a: typeof p0, b: typeof p0) => Math.max(1e-3, Math.hypot(b.x - a.x, b.y - a.y) ** 0.5);
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const steps = Math.max(8, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
    for (let k = 0; k < steps; k++) {
      const u = k / steps;
      const t = t1 + (t2 - t1) * u;
      const mix = (a: number, b: number, ta: number, tb: number) => ((tb - t) / (tb - ta)) * a + ((t - ta) / (tb - ta)) * b;
      const ax = mix(p0.x, p1.x, 0, t1), ay = mix(p0.y, p1.y, 0, t1);
      const bx = mix(p1.x, p2.x, t1, t2), by = mix(p1.y, p2.y, t1, t2);
      const cx = mix(p2.x, p3.x, t2, t3), cy = mix(p2.y, p3.y, t2, t3);
      const dx = mix(ax, bx, 0, t2), dy = mix(ay, by, 0, t2);
      const ex = mix(bx, cx, t1, t3), ey = mix(by, cy, t1, t3);
      const e = smooth(u);
      raw.push({ x: mix(dx, ex, t1, t2), y: mix(dy, ey, t1, t2), w: p1.w + (p2.w - p1.w) * e, i: p1.i + (p2.i - p1.i) * e });
    }
  }
  raw.push(last);

  // Resample to even spacing so a distance along the route maps to an index.
  const out: typeof raw = [raw[0]];
  let carry = 0;
  for (let k = 1; k < raw.length; k++) {
    const a = raw[k - 1];
    const b = raw[k];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = STEP - carry;
    while (d <= seg) {
      const f = d / seg;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, i: a.i + (b.i - a.i) * f });
      d += STEP;
    }
    carry = seg - (d - STEP);
  }

  const n = out.length;
  const route: Route = {
    x: new Float32Array(n),
    y: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    width: new Float32Array(n),
    intensity: new Float32Array(n),
    reach: new Float32Array(n),
    length: (n - 1) * STEP,
    stops: points.map((p) => ({ y: p.y, intensity: p.i })),
  };
  let reach = -Infinity;
  out.forEach((p, k) => {
    route.x[k] = p.x;
    route.y[k] = p.y;
    route.width[k] = p.w;
    route.intensity[k] = p.i;
    reach = Math.max(reach, p.y);
    route.reach[k] = reach;
  });
  for (let k = 0; k < n; k++) {
    const a = Math.max(0, k - 2);
    const b = Math.min(n - 1, k + 2);
    const tx = route.x[b] - route.x[a];
    const ty = route.y[b] - route.y[a];
    const len = Math.hypot(tx, ty) || 1;
    route.nx[k] = -ty / len;
    route.ny[k] = tx / len;
  }
  return route;
};

const indexAt = (route: Route, s: number) => Math.max(0, Math.min(route.x.length - 1, Math.round(s / STEP)));

/** First index whose y lies below `y` (route reach is non-decreasing). */
const indexBelow = (route: Route, y: number) => {
  let lo = 0;
  let hi = route.reach.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (route.reach[mid] < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/* Drawing the current ---------------------------------------------------- */

const SVG = "http://www.w3.org/2000/svg";

const svgEl = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
};

const gradient = (id: string, route: Route, height: number, color: string) => {
  const grad = svgEl("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: 0, y1: 0, x2: 0, y2: height });
  for (const stop of route.stops) {
    grad.appendChild(
      svgEl("stop", {
        offset: clamp01(stop.y / height).toFixed(4),
        style: `stop-color: var(${color}); stop-opacity: ${stop.intensity.toFixed(2)}`,
      }),
    );
  }
  return grad;
};

/** Outline of the band at `scale` × its width, as a closed path. */
const bandPath = (route: Route, half: number, scale: number) => {
  const left: string[] = [];
  const right: string[] = [];
  for (let k = 0; k < route.x.length; k += 2) {
    const w = route.width[k] * half * scale;
    left.push(`${(route.x[k] + route.nx[k] * w).toFixed(1)} ${(route.y[k] + route.ny[k] * w).toFixed(1)}`);
    right.push(`${(route.x[k] - route.nx[k] * w).toFixed(1)} ${(route.y[k] - route.ny[k] * w).toFixed(1)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
};

const linePath = (route: Route) => {
  const parts: string[] = [];
  for (let k = 0; k < route.x.length; k += 3) parts.push(`${route.x[k].toFixed(1)} ${route.y[k].toFixed(1)}`);
  return `M${parts.join("L")}`;
};

/* Characters --------------------------------------------------------- */

type Glyph = {
  node: HTMLElement;
  ink: HTMLElement;
  glow: HTMLElement;
  /** Distance along the route, px, and speed downstream, px/s. */
  s: number;
  speed: number;
  /** Distance from the route as a share of the band, start and drift. */
  offset: number;
  drift: number;
  /** Slow wander across the route: amplitude px, frequency Hz, phase. */
  wander: [number, number, number];
  depth: number;
  peak: number;
  /** A few characters brighten once on their way. */
  shine: number;
  spin: number;
  born: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  /** -1 while waiting to be spawned. */
  state: number;
  lit: number;
  push: [number, number];
  glowWritten: number;
};

// Slots keep a depth band, so a few near, some middle and many far characters are always present.
const DEPTH_BANDS: [number, number][] = [
  [0.74, 1],
  [0.4, 0.72],
  [0.4, 0.72],
  [0, 0.36],
  [0, 0.36],
];

const pickGlyph = (r: () => number, taken: Set<string>) => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const pool = r() < 0.1 ? WORDS : GLYPHS;
    const glyph = pool[Math.floor(r() * pool.length)];
    if (!taken.has(glyph)) return glyph;
  }
  return GLYPHS[Math.floor(r() * GLYPHS.length)];
};

const makeNode = (layer: HTMLElement) => {
  const node = document.createElement("span");
  node.className = "hf-glyph";
  node.lang = "ko";
  node.style.opacity = "0";
  const ink = document.createElement("span");
  ink.className = "hf-ink";
  const glow = document.createElement("span");
  glow.className = "hf-glow";
  node.append(ink, glow);
  layer.appendChild(node);
  return { node, ink, glow };
};

/* Readability: characters dim over copy and behind glass ---------------- */

type Shade = Box & { factor: number };

const COPY = "h1, h2, h3, p, dl, ol, figcaption, .lg";

const measureShades = (root: HTMLElement): Shade[] => {
  const shades: Shade[] = [];
  root.querySelectorAll<HTMLElement>("[data-flow-glass]").forEach((el) => shades.push({ ...boxIn(el, root), factor: 0.6 }));
  // Decorative glyphs of the page itself stay clear of passing characters.
  root.querySelectorAll<HTMLElement>("[data-flow-quiet]").forEach((el) => shades.push({ ...boxIn(el, root), factor: 0.3 }));
  root.querySelectorAll<HTMLElement>(COPY).forEach((el) => {
    if (el.closest(".hangul-flow") || !el.offsetWidth) return;
    shades.push({ ...boxIn(el, root), factor: 0.14 });
  });
  return shades;
};

/** Opacity factor at (x, y) for a character of radius `radius`. */
const shadeAt = (shades: Shade[], x: number, y: number, radius: number, top: number, bottom: number) => {
  let factor = 1;
  for (const box of shades) {
    if (box.top > bottom || box.top + box.height < top) continue;
    const dx = Math.max(box.left - x, 0, x - box.left - box.width);
    const dy = Math.max(box.top - y, 0, y - box.top - box.height);
    const gap = Math.hypot(dx, dy) - radius;
    if (gap >= 36) continue;
    const t = gap <= 0 ? 1 : 1 - smooth(gap / 36);
    factor *= 1 - (1 - box.factor) * t;
  }
  return factor;
};

/* Engine --------------------------------------------------------------- */

/** Starts the flow in `layer`, routed through the elements of `root`. Returns a stop function. */
export const startHangulFlow = (layer: HTMLElement, root: HTMLElement, options: FlowOptions) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lightable = !reduced && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 640px)").matches;
  const r = rng(reduced ? options.seed : options.seed ^ Math.floor(Math.random() * 1e9));

  const band = svgEl("svg", { class: "hf-band", "aria-hidden": "true" });
  const line = svgEl("svg", { class: "hf-line", "aria-hidden": "true" });
  const lightNode = document.createElement("div");
  lightNode.className = "hf-light";
  layer.append(band, line, lightNode);

  let profile = PROFILES.desktop;
  let route: Route | null = null;
  let shades: Shade[] = [];
  let lineNode: SVGPathElement | null = null;
  // How far down the page (px) the gold line is drawn.
  let drawn = 0;
  let drawnWritten = -1;
  let height = 0;
  let rootTop = 0;
  let width = 0;
  const glyphs: Glyph[] = [];

  const fontPx = (depth: number, w: number) => {
    const [min, max] = profile.size;
    return (min + (max - min) * depth) * (0.78 + 0.22 * Math.min(1.3, w)) * 16;
  };

  /* Placing a character: where it starts, how it travels and lives. */
  const configure = (g: Glyph, slot: number, s: number, now: number) => {
    if (!route) return;
    const k = indexAt(route, s);
    const bandDepth = DEPTH_BANDS[slot % DEPTH_BANDS.length];
    g.depth = bandDepth[0] + r() * (bandDepth[1] - bandDepth[0]);
    const prominence = g.depth > 0.74 ? 1 : g.depth > 0.4 ? 0.52 : 0.24;
    g.peak = Math.min(0.9, profile.presence * prominence + r() * 0.05);
    g.s = s;
    // Near characters move faster: the current has depth.
    g.speed = 6 + r() * 14 + g.depth * 22;
    const side = r() < 0.5 ? -1 : 1;
    g.offset = side * (0.1 + Math.abs(r() + r() - 1) * 1.5 + g.depth * 0.25);
    g.drift = (r() - 0.5) * 0.8;
    g.wander = [4 + r() * 12, 0.02 + r() * 0.04, r() * 6.3];
    g.shine = g.depth > 0.6 && r() < 0.35 ? 0.35 + r() * 0.3 : 0;
    g.spin = (r() - 0.5) * 6;
    g.born = now;
    g.fadeIn = 3 + r() * 3.5;
    g.hold = 5 + r() * 11;
    g.fadeOut = 4 + r() * 4;
    g.state = 1;
    const taken = new Set(glyphs.filter((o) => o !== g && o.state > 0).map((o) => o.ink.dataset.g ?? ""));
    const glyph = pickGlyph(r, taken);
    g.ink.dataset.g = glyph;
    g.glow.dataset.g = glyph;
    g.node.style.fontSize = `${fontPx(g.depth, route.width[k]).toFixed(1)}px`;
    g.node.style.setProperty("--d", g.depth.toFixed(2));
  };

  /** A spot on the route inside [top, bottom] of the page, favouring intense stretches. */
  const pickSpot = (top: number, bottom: number) => {
    if (!route) return -1;
    const a = indexBelow(route, top);
    const b = indexBelow(route, bottom);
    if (b <= a) return -1;
    for (let attempt = 0; attempt < 6; attempt++) {
      const k = a + Math.floor(r() * (b - a));
      if (r() < route.intensity[k] ** profile.focus) return k * STEP;
    }
    return -1;
  };

  /* Layout: route, band, line, readability boxes. */
  const measure = () => {
    const wide = matchMedia("(min-width: 1024px)").matches;
    const mid = matchMedia("(min-width: 640px)").matches;
    const mode = wide ? "desktop" : mid ? "tablet" : "mobile";
    profile = PROFILES[mode];
    width = root.offsetWidth;
    height = root.offsetHeight;
    rootTop = root.getBoundingClientRect().top + scrollY;

    const points = options.routes[mode].flatMap(([key, fx, fy, w, i]) => {
      const el = root.querySelector<HTMLElement>(`[data-flow="${key}"]`);
      if (!el || !el.offsetWidth) return [];
      const box = boxIn(el, root);
      return [{ x: box.left + box.width * fx, y: box.top + box.height * fy, w, i }];
    });
    route = buildRoute(points);
    shades = measureShades(root);

    band.replaceChildren();
    line.replaceChildren();
    for (const svg of [band, line]) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
    }
    if (!route) return;

    const defs = svgEl("defs", {});
    defs.appendChild(gradient("hf-band-grad", route, height, "--flow-band"));
    band.appendChild(defs);
    // Nested ribbons, blurred in CSS, give the band a soft core and falloff.
    for (const [scale, opacity] of [
      [1, 0.5],
      [0.55, 0.7],
    ]) {
      band.appendChild(svgEl("path", { d: bandPath(route, profile.band, scale), fill: "url(#hf-band-grad)", opacity }));
    }
    const lineDefs = svgEl("defs", {});
    lineDefs.appendChild(gradient("hf-line-grad", route, height, "--flow-line"));
    line.appendChild(lineDefs);
    lineNode = svgEl("path", { d: linePath(route), fill: "none", stroke: "url(#hf-line-grad)", "stroke-width": wide ? 1.2 : 1 });
    line.appendChild(lineNode);
    if (!reduced) {
      // Revealed with a clip (paint only, no layout) as the reader scrolls.
      drawn = Math.min(drawn, height);
      drawnWritten = drawn;
      line.style.clipPath = `inset(0 0 ${(height - drawn).toFixed(0)}px 0)`;
    }
  };

  /* Reduced motion: a still composition along the whole route. */
  const compose = () => {
    if (!route) return;
    glyphs.forEach((g) => g.node.remove());
    glyphs.length = 0;
    let slot = 0;
    let s = 40 + r() * 60;
    while (s < route.length && glyphs.length < 56) {
      const k = indexAt(route, s);
      const intensity = route.intensity[k];
      if (intensity > 0.28) {
        const g = { ...makeNode(layer), state: -1, lit: 0, push: [0, 0], glowWritten: 0 } as Glyph;
        glyphs.push(g);
        configure(g, slot++, s, 0);
        const half = profile.band * route.width[k];
        const off = g.offset * half;
        const x = route.x[k] + route.nx[k] * off;
        const y = route.y[k] + route.ny[k] * off;
        const radius = fontPx(g.depth, route.width[k]) * 0.5;
        const opacity = g.peak * (0.4 + 0.6 * intensity) * shadeAt(shades, x, y, radius, y - 200, y + 200);
        g.node.style.opacity = opacity.toFixed(3);
        g.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${(g.spin * 0.5).toFixed(2)}deg)`;
      }
      s += profile.spacing * (1.5 - intensity) * (0.7 + r() * 0.6);
    }
  };

  measure();
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
      observer.disconnect();
      cancelAnimationFrame(pending);
      layer.replaceChildren();
    };
  }

  for (let i = 0; i < profile.count; i++) {
    glyphs.push({ ...makeNode(layer), state: -1, lit: 0, push: [0, 0], glowWritten: 0 } as Glyph);
  }

  // The first frame is already populated: characters start part-way through their lives.
  const start = performance.now();
  const seedView = () => {
    const top = scrollY - rootTop;
    glyphs.forEach((g, slot) => {
      const s = pickSpot(top - innerHeight * 0.1, top + innerHeight * 1.05);
      if (s < 0) {
        g.state = -1;
        g.born = r() * 3;
        return;
      }
      configure(g, slot, s, 0);
      g.hold += r() * 8;
      g.born = -(g.fadeIn * 0.6 + r() * g.hold * 0.7);
    });
  };
  seedView();

  /* Pointer: a soft light that wakes only near the current. */
  const pointer = { x: -1e4, y: -1e4, active: false, nx: 0, ny: 0 };
  const light = { x: -1e4, y: -1e4, strength: 0 };
  const view = { x: 0, y: 0 };
  const onMove = (event: PointerEvent) => {
    pointer.x = event.clientX - root.getBoundingClientRect().left;
    pointer.y = event.clientY + scrollY - rootTop;
    pointer.active = true;
    pointer.nx = Math.max(-1, Math.min(1, (event.clientX / innerWidth) * 2 - 1));
    pointer.ny = Math.max(-1, Math.min(1, (event.clientY / innerHeight) * 2 - 1));
    if (light.x < -1e3) {
      light.x = pointer.x;
      light.y = pointer.y;
    }
  };
  const onLeave = () => {
    pointer.active = false;
  };
  const nearRoute = () => {
    if (!route || !pointer.active) return 0;
    const a = indexBelow(route, pointer.y - 320);
    const b = indexBelow(route, pointer.y + 320);
    let best = Infinity;
    for (let k = a; k <= b; k += 4) best = Math.min(best, Math.hypot(route.x[k] - pointer.x, route.y[k] - pointer.y) - route.width[k] * profile.band);
    return 1 - smooth(clamp01(best / 260));
  };

  let frame = 0;
  let running = false;
  let previous = start;
  let resized = 0;

  const render = (now: number) => {
    const t = (now - start) / 1000;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const ease = (rate: number) => Math.min(1, dt * rate);
    if (!route) {
      frame = running ? requestAnimationFrame(render) : 0;
      return;
    }

    const top = scrollY - rootTop;
    const bottom = top + innerHeight;

    // The gold line draws itself downward just ahead of the reader.
    const target = Math.max(drawn, Math.min(height, top + innerHeight * 0.88));
    if (target - drawn > 0.5) {
      drawn = target - drawn < 1 ? target : drawn + (target - drawn) * ease(2.4);
      // Repaint the line only for a visible step.
      if (drawn - drawnWritten >= 2 || drawn === target) {
        drawnWritten = drawn;
        line.style.clipPath = `inset(0 0 ${(height - drawn).toFixed(0)}px 0)`;
      }
    }

    light.x += (pointer.x - light.x) * ease(3);
    light.y += (pointer.y - light.y) * ease(3);
    light.strength += (nearRoute() - light.strength) * ease(1.6);
    view.x += ((pointer.active ? pointer.nx : 0) - view.x) * ease(1.2);
    view.y += ((pointer.active ? pointer.ny : 0) - view.y) * ease(1.2);
    if (lightable) {
      lightNode.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      lightNode.style.opacity = (light.strength * 0.8).toFixed(3);
    }

    // New characters need text layout: at most two per frame keeps scrolling smooth.
    let spawns = 2;
    glyphs.forEach((g, slot) => {
      // Waiting: spawn near the reader once the pause is over.
      if (g.state < 0) {
        if (t < g.born || spawns === 0) return;
        spawns--;
        const s = pickSpot(top - innerHeight * 0.12, bottom + innerHeight * 0.05);
        if (s < 0) {
          g.born = t + 0.8 + r() * 1.6;
          return;
        }
        configure(g, slot, s, t);
      }
      const age = t - g.born;
      const life = g.fadeIn + g.hold + g.fadeOut;
      const k = indexAt(route!, g.s + g.speed * Math.max(0, age));
      const y0 = route!.y[k];
      const outOfView = y0 < top - innerHeight * 0.6 || y0 > bottom + innerHeight * 0.6;
      if (age >= life || k >= route!.x.length - 1 || outOfView) {
        g.state = -1;
        g.node.style.opacity = "0";
        // Leaving the view returns the slot quickly so the current follows the reader.
        g.born = t + (outOfView ? 0.2 + r() * 0.8 : 0.6 + r() * 2.4);
        return;
      }

      const fade = age < g.fadeIn ? smooth(clamp01(age / g.fadeIn)) : age < g.fadeIn + g.hold ? 1 : 1 - smooth((age - g.fadeIn - g.hold) / g.fadeOut);
      const u = age / life;
      const half = profile.band * route!.width[k];
      const [amp, freq, phase] = g.wander;
      const off = (g.offset + g.drift * u) * half + amp * Math.sin(age * freq * 6.283 + phase);
      const x = route!.x[k] + route!.nx[k] * off;
      const y = route!.y[k] + route!.ny[k] * off;

      let lit = 0;
      let pushX = 0;
      let pushY = 0;
      if (lightable && light.strength > 0.01) {
        const dx = x - light.x;
        const dy = y - light.y;
        const dist = Math.hypot(dx, dy);
        const near = Math.max(0, 1 - dist / 300);
        lit = near * near * light.strength;
        const lean = lit * (2 + g.depth * 4);
        pushX = dist > 0 ? (dx / dist) * lean : 0;
        pushY = dist > 0 ? (dy / dist) * lean : 0;
      }
      g.lit += (lit - g.lit) * ease(2.5);
      g.push[0] += (pushX - g.push[0]) * ease(2.5);
      g.push[1] += (pushY - g.push[1]) * ease(2.5);
      const px = -view.x * 5 * g.depth;
      const py = -view.y * 3 * g.depth;

      const size = fontPx(g.depth, route!.width[k]);
      const shade = shadeAt(shades, x, y, size * 0.5, top - 200, bottom + 200);
      const intensity = 0.35 + 0.65 * route!.intensity[k];
      const breathe = 0.88 + 0.12 * Math.sin(age * 0.33 + phase);
      const shine = g.shine * Math.max(0, Math.sin(u * Math.PI)) ** 3;
      const opacity = fade * shade * Math.min(1, g.peak * intensity * breathe + g.lit * 0.45 + shine * 0.25);
      const rotate = g.spin * Math.sin(age * 0.07 + phase);
      const scale = 0.94 + 0.08 * u + g.lit * 0.04;

      g.node.style.opacity = opacity.toFixed(3);
      g.node.style.transform =
        `translate3d(${(x + g.push[0] + px).toFixed(1)}px, ${(y + g.push[1] + py).toFixed(1)}px, 0) ` +
        `translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      // The gold glow only repaints when it visibly changes.
      const glow = Math.round(Math.min(1, g.lit + shine) * 50) / 50;
      if (glow !== g.glowWritten) {
        g.glow.style.opacity = String(glow);
        g.glowWritten = glow;
      }
    });

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

  // Re-route when the layout changes (fonts, viewport, content).
  const observer = new ResizeObserver(() => {
    clearTimeout(resized);
    resized = window.setTimeout(() => {
      const before = width;
      measure();
      if (glyphs.length !== profile.count || Math.abs(before - width) > 1) {
        // A different breakpoint or width: rebuild the characters for the new route.
        glyphs.forEach((g) => g.node.remove());
        glyphs.length = 0;
        for (let i = 0; i < profile.count; i++) glyphs.push({ ...makeNode(layer), state: -1, lit: 0, push: [0, 0], glowWritten: 0 } as Glyph);
        seedView();
      }
    }, 150);
  });
  observer.observe(root);

  const onVisibility = () => (document.hidden ? pause() : play());
  document.addEventListener("visibilitychange", onVisibility);
  if (lightable) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }

  return () => {
    pause();
    clearTimeout(resized);
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    layer.replaceChildren();
    delete layer.dataset.ready;
  };
};
