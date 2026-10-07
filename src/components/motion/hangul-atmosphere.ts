/*
  Hangul atmosphere: a night sky of Hangul behind the page, framework-free so
  the site and its review preview run the same code.

  A stage the size of the viewport stays pinned behind the content (CSS
  sticky, so scrolling costs nothing) and holds four depths:
  - nebulae: two soft navy glows in opposite corners that slowly breathe (CSS);
  - dust: tiny, faint jamo in two tiles that drift a little with the scroll;
  - drift: a few larger, faint syllables gliding slowly across the midground;
  - shooting Hangul: characters that cross the sky on steep, slightly
    diagonal paths, each leaving a fading trail. They come in staggered
    bursts with quiet gaps; now and then a stronger moment brings a fuller
    burst and a gold arc glint along the upper glow.

  Intensity follows presets (hero, strong, medium, subtle, static). The
  layer's own variant applies everywhere except inside elements marked
  data-atmosphere="<variant>", so a page can lift its hero above the rest.
  Characters dim over copy and behind glass so text always reads first.

  One requestAnimationFrame loop writes transform and opacity only, pauses
  in background tabs, and spawns at most two characters per frame (a new
  character costs a text layout). With reduced motion, or the static
  variant, the same elements form a still composition.
*/

export type AtmosphereVariant = "hero" | "strong" | "medium" | "subtle" | "static";

export type AtmosphereOptions = { variant: AtmosphereVariant; seed: number };

type Preset = {
  /** Share of the device's shooting pool in use, and their brightness. */
  shots: number;
  /** Quiet gap between bursts, s. */
  gap: [number, number];
  /** Characters per ordinary burst. */
  burst: [number, number];
  /** Chance that a burst is a strong moment (fuller burst and arc glint). */
  moment: number;
  /** Opacity of the dust, drift and nebula layers. */
  dust: number;
  drift: number;
  nebula: number;
};

const PRESETS: Record<AtmosphereVariant, Preset> = {
  hero: { shots: 1, gap: [1.6, 4.4], burst: [2, 4], moment: 0.16, dust: 1, drift: 1, nebula: 1 },
  strong: { shots: 0.8, gap: [2.2, 5.5], burst: [1, 3], moment: 0.09, dust: 0.85, drift: 0.85, nebula: 0.8 },
  medium: { shots: 0.55, gap: [4, 9], burst: [1, 2], moment: 0.03, dust: 0.65, drift: 0.6, nebula: 0.6 },
  subtle: { shots: 0.3, gap: [7, 14], burst: [1, 1], moment: 0, dust: 0.45, drift: 0.35, nebula: 0.4 },
  static: { shots: 0, gap: [1e9, 1e9], burst: [0, 0], moment: 0, dust: 0.6, drift: 0.6, nebula: 0.6 },
};

type Device = {
  dust: number;
  drift: number;
  /** Shooting characters that can be in flight at once. */
  pool: number;
  /** Head size range in rem, far to near. */
  head: [number, number];
  /** Trail length range in px, far to near. */
  trail: [number, number];
  /** Speed range in px/s, far to near. */
  speed: [number, number];
};

const DEVICES: Record<"desktop" | "tablet" | "mobile", Device> = {
  desktop: { dust: 40, drift: 8, pool: 7, head: [0.85, 2.3], trail: [170, 460], speed: [240, 680] },
  tablet: { dust: 28, drift: 6, pool: 5, head: [0.8, 1.95], trail: [130, 340], speed: [210, 560] },
  mobile: { dust: 18, drift: 4, pool: 4, head: [0.75, 1.55], trail: [90, 220], speed: [170, 420] },
};

const SHOOTING = ["ㅎ", "ㄱ", "ㅁ", "ㅅ", "ㅇ", "한", "글", "말", "빛", "배", "우", "별", "ㄴ", "ㅏ", "길", "꿈"];
const DRIFTING = ["말", "빛", "글", "한", "별", "숨", "길", "꿈", "배", "우", "달", "봄"];
const DUST = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ", "ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"];
/** Trail tones: warm white most often, then soft white, restrained gold, muted navy light. */
const TONES: [string, number][] = [
  ["warm", 0.42],
  ["white", 0.26],
  ["gold", 0.2],
  ["navy", 0.12],
];

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
const mod = (a: number, n: number) => ((a % n) + n) % n;

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

/* Readability: characters dim over copy and behind glass ---------------- */

type Shade = Box & { factor: number };

const COPY = "h1, h2, h3, p, dl, ol, figcaption, .lg";

const measureShades = (root: HTMLElement): Shade[] => {
  const shades: Shade[] = [];
  root.querySelectorAll<HTMLElement>("[data-atmo-glass]").forEach((el) => shades.push({ ...boxIn(el, root), factor: 0.6 }));
  // Decorative glyphs of the page itself stay clear of passing characters.
  root.querySelectorAll<HTMLElement>("[data-atmo-quiet]").forEach((el) => shades.push({ ...boxIn(el, root), factor: 0.3 }));
  root.querySelectorAll<HTMLElement>(COPY).forEach((el) => {
    if (el.closest(".hangul-atmosphere") || !el.offsetWidth) return;
    shades.push({ ...boxIn(el, root), factor: 0.14 });
  });
  return shades;
};

/** Opacity factor at (x, y) for a character of radius `radius`. */
const shadeAt = (shades: Shade[], x: number, y: number, radius: number) => {
  let factor = 1;
  for (const box of shades) {
    const dx = Math.max(box.left - x, 0, x - box.left - box.width);
    const dy = Math.max(box.top - y, 0, y - box.top - box.height);
    const gap = Math.hypot(dx, dy) - radius;
    if (gap >= 36) continue;
    const t = gap <= 0 ? 1 : 1 - smooth(gap / 36);
    factor *= 1 - (1 - box.factor) * t;
  }
  return factor;
};

/* Elements --------------------------------------------------------------- */

const el = (className: string, parent: HTMLElement) => {
  const node = document.createElement("span");
  node.className = className;
  parent.appendChild(node);
  return node;
};

type Shot = {
  node: HTMLElement;
  head: HTMLElement;
  trail: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
  depth: number;
  peak: number;
  len: number;
  radius: number;
  travelled: number;
  /** Distance after which the character fades out mid-sky. */
  reach: number;
  age: number;
  /** -1 while idle. */
  state: number;
  grow: number;
};

type Drifter = {
  node: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number;
  peak: number;
  radius: number;
  /** Parallax share of the scroll. */
  par: number;
  born: number;
  life: number;
};

/** Starts the atmosphere in `layer`, behind the content of `root`. Returns a stop function. */
export const startHangulAtmosphere = (layer: HTMLElement, root: HTMLElement, options: AtmosphereOptions) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const still = reduced || options.variant === "static";
  const lightable = !still && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 640px)").matches;
  const r = rng(still ? options.seed : options.seed ^ Math.floor(Math.random() * 1e9));

  const stage = document.createElement("div");
  stage.className = "ha-stage";
  const nebulae = document.createElement("div");
  nebulae.className = "ha-nebulae";
  el("ha-nebula ha-nebula-a", nebulae);
  el("ha-nebula ha-nebula-b", nebulae);
  const dustFar = document.createElement("div");
  const dustNear = document.createElement("div");
  dustFar.className = dustNear.className = "ha-dust";
  const glint = document.createElement("div");
  glint.className = "ha-glint";
  const light = document.createElement("div");
  light.className = "ha-light";
  stage.append(nebulae, dustFar, dustNear, glint, light);
  layer.replaceChildren(stage);
  if (still) layer.dataset.still = "";

  let device = DEVICES.desktop;
  let mode = "";
  let width = 0;
  let viewH = 0;
  let height = 0;
  let rootTop = 0;
  let shades: Shade[] = [];
  let zones: { top: number; bottom: number; preset: Preset }[] = [];
  const shots: Shot[] = [];
  const drifters: Drifter[] = [];
  const base = PRESETS[options.variant] ?? PRESETS.medium;

  /** Top of the pinned stage within root, for the current scroll. */
  const stageTop = () => Math.max(0, Math.min(height - viewH, scrollY - rootTop));

  const presetAt = (y: number) => zones.find((zone) => y >= zone.top && y < zone.bottom)?.preset ?? base;

  /* Dust: two tiles per depth, stacked, so a parallax shift can wrap. */
  const buildDust = () => {
    for (const [layerEl, near] of [
      [dustFar, false],
      [dustNear, true],
    ] as const) {
      layerEl.replaceChildren();
      const count = Math.round(device.dust * (near ? 0.4 : 0.6));
      for (let i = 0; i < count; i++) {
        const x = r() * width;
        const y = r() * viewH;
        const size = near ? 0.68 + r() * 0.32 : 0.5 + r() * 0.2;
        const opacity = near ? 0.3 + r() * 0.35 : 0.16 + r() * 0.24;
        const glyph = DUST[Math.floor(r() * DUST.length)];
        for (const copy of [0, 1]) {
          const speck = el("ha-speck", layerEl);
          speck.textContent = glyph;
          speck.style.cssText = `left:${x.toFixed(0)}px;top:${(y + copy * viewH).toFixed(0)}px;font-size:${size.toFixed(2)}rem;opacity:${opacity.toFixed(2)}`;
        }
      }
    }
  };

  const placeDrifter = (d: Drifter, now: number, anywhere: boolean) => {
    d.depth = r();
    d.peak = 0.1 + d.depth * 0.16 + r() * 0.04;
    const size = (1.3 + d.depth * 2.1) * (mode === "mobile" ? 0.8 : 1);
    d.radius = size * 8;
    d.x = r() * width;
    d.y = anywhere ? r() * viewH : r() * viewH * 0.8;
    const angle = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.5);
    const speed = 5 + d.depth * 9 + r() * 4;
    d.vx = Math.sin(angle) * speed;
    d.vy = Math.cos(angle) * speed;
    d.par = 0.06 + d.depth * 0.14;
    d.born = now;
    d.life = 16 + r() * 18;
    // Each drifting syllable appears once at a time.
    const taken = new Set(drifters.map((o) => o.node.dataset.g));
    let glyph = DRIFTING[Math.floor(r() * DRIFTING.length)];
    for (let attempt = 0; attempt < 8 && taken.has(glyph); attempt++) glyph = DRIFTING[Math.floor(r() * DRIFTING.length)];
    d.node.dataset.g = glyph;
    d.node.style.fontSize = `${size.toFixed(2)}rem`;
    d.node.style.setProperty("--d", d.depth.toFixed(2));
  };

  const buildCast = () => {
    shots.forEach((s) => s.node.remove());
    drifters.forEach((d) => d.node.remove());
    shots.length = 0;
    drifters.length = 0;
    for (let i = 0; i < device.drift; i++) {
      const node = document.createElement("span");
      node.className = "ha-drift";
      node.lang = "ko";
      node.style.opacity = "0";
      stage.insertBefore(node, glint);
      const d = { node } as Drifter;
      placeDrifter(d, 0, true);
      drifters.push(d);
    }
    for (let i = 0; i < device.pool; i++) {
      const node = document.createElement("span");
      node.className = "ha-shot";
      node.style.opacity = "0";
      const trail = el("ha-trail", node);
      const head = el("ha-head", node);
      head.lang = "ko";
      stage.insertBefore(node, glint);
      shots.push({ node, head, trail, state: -1 } as Shot);
    }
  };

  /* Layout: viewport, page height, zones and readability boxes. */
  const measure = () => {
    const wide = matchMedia("(min-width: 1024px)").matches;
    const mid = matchMedia("(min-width: 640px)").matches;
    const nextMode = wide ? "desktop" : mid ? "tablet" : "mobile";
    const nextWidth = root.offsetWidth;
    const nextViewH = innerHeight;
    height = root.offsetHeight;
    rootTop = root.getBoundingClientRect().top + scrollY;
    shades = measureShades(root);
    zones = [...root.querySelectorAll<HTMLElement>("[data-atmosphere]")].flatMap((zone) => {
      const preset = PRESETS[zone.dataset.atmosphere as AtmosphereVariant];
      if (!preset) return [];
      const box = boxIn(zone, root);
      return [{ top: box.top, bottom: box.top + box.height, preset }];
    });
    const rebuilt = nextMode !== mode || Math.abs(nextWidth - width) > 1 || Math.abs(nextViewH - viewH) > 120;
    mode = nextMode;
    device = DEVICES[nextMode];
    width = nextWidth;
    viewH = nextViewH;
    if (rebuilt) {
      buildDust();
      buildCast();
    }
    // The glint's circle hugs the upper glow; its size follows the viewport.
    const diameter = Math.max(width, viewH) * (mode === "mobile" ? 1.15 : 0.82);
    glint.style.width = glint.style.height = `${diameter.toFixed(0)}px`;
    glint.style.left = `${(width * 0.9 - diameter / 2).toFixed(0)}px`;
    glint.style.top = `${(-diameter * 0.32).toFixed(0)}px`;
    return rebuilt;
  };

  /* Shooting characters --------------------------------------------- */

  const launch = (shot: Shot, direction: number, near: boolean) => {
    const depth = near ? 0.65 + r() * 0.35 : r() ** 1.4;
    shot.depth = depth;
    const [h0, h1] = device.head;
    const [t0, t1] = device.trail;
    const [v0, v1] = device.speed;
    // Steep, slightly diagonal: 10–30 degrees off vertical, the burst's way.
    const tilt = direction * (0.17 + r() * 0.35);
    shot.speed = v0 + (v1 - v0) * depth * (0.8 + r() * 0.4);
    shot.vx = Math.sin(tilt) * shot.speed;
    shot.vy = Math.cos(tilt) * shot.speed;
    shot.angle = Math.atan2(shot.vy, shot.vx);
    shot.len = (t0 + (t1 - t0) * depth) * (0.75 + r() * 0.5);
    const size = h0 + (h1 - h0) * depth;
    shot.radius = size * 8;
    shot.peak = 0.5 + depth * 0.5;
    // Enter from above the top edge (now and then from the side), so the path crosses the sky.
    const drift = Math.tan(tilt) * viewH * 0.6;
    shot.x = width * (0.04 + r() * 0.92) - drift;
    shot.y = -40 - r() * 80;
    if (r() < 0.18) {
      shot.x = direction > 0 ? -40 : width + 40;
      shot.y = r() * viewH * 0.35;
    }
    shot.travelled = 0;
    shot.reach = viewH * (0.55 + r() * 0.65);
    shot.age = 0;
    shot.grow = -1;
    shot.state = 1;
    let tone = r();
    let name = "warm";
    for (const [key, share] of TONES) {
      if (tone < share) {
        name = key;
        break;
      }
      tone -= share;
    }
    // Far characters keep to the cooler tones.
    if (depth < 0.25 && name === "gold") name = "navy";
    shot.node.dataset.tone = name;
    shot.head.dataset.g = SHOOTING[Math.floor(r() * SHOOTING.length)];
    shot.head.style.fontSize = `${size.toFixed(2)}rem`;
    shot.trail.style.width = `${shot.len.toFixed(0)}px`;
    shot.node.style.setProperty("--d", depth.toFixed(2));
  };

  /* Arc glint: a short bright segment sweeping along a wide circle (WAAPI, compositor only). */
  const sweep = (strength: number) => {
    if (!glint.animate) return;
    const from = 140 + r() * 50;
    const to = from + 45 + r() * 30;
    // The mask's bright head sits at 352°; rotating moves it along the circle.
    glint.animate(
      [
        { transform: `rotate(${(from - 352).toFixed(1)}deg)`, opacity: 0 },
        { opacity: strength, offset: 0.3 },
        { opacity: strength * 0.8, offset: 0.7 },
        { transform: `rotate(${(to - 352).toFixed(1)}deg)`, opacity: 0 },
      ],
      { duration: 2200 + r() * 900, easing: "cubic-bezier(0.45, 0, 0.3, 1)" },
    );
  };

  /* Still composition: reduced motion or the static variant. */
  const compose = () => {
    stage.style.removeProperty("--ha-level");
    const spots: [number, number, number][] =
      mode === "desktop"
        ? [
            [0.86, 0.24, 0.9],
            [0.7, 0.58, 0.55],
            [0.94, 0.72, 0.35],
          ]
        : mode === "tablet"
          ? [
              [0.88, 0.22, 0.8],
              [0.74, 0.66, 0.45],
            ]
          : [
              [0.9, 0.16, 0.7],
              [0.2, 0.86, 0.4],
            ];
    shots.forEach((shot, i) => {
      const spot = spots[i];
      if (!spot) {
        shot.state = -1;
        return;
      }
      launch(shot, 1, spot[2] > 0.6);
      shot.depth = spot[2];
      shot.x = width * spot[0];
      shot.y = viewH * spot[1];
      shot.travelled = shot.len;
      shot.state = 1;
      shot.node.style.transform = `translate3d(${shot.x.toFixed(1)}px, ${shot.y.toFixed(1)}px, 0)`;
      shot.trail.style.transform = `rotate(${shot.angle.toFixed(4)}rad)`;
    });
    drifters.forEach((d) => {
      d.node.style.transform = `translate3d(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    });
    glint.style.transform = `rotate(${(200 - 352).toFixed(1)}deg)`;
    nebulae.style.opacity = String(base.nebula);
    dustFar.style.opacity = dustNear.style.opacity = String(base.dust);
    shadeStill();
  };

  /** Still mode: only opacity follows the scroll, so the composition never covers copy. */
  const shadeStill = () => {
    const offset = stageTop();
    const preset = presetAt(offset + viewH * 0.5);
    shots.forEach((shot) => {
      if (shot.state < 0) {
        shot.node.style.opacity = "0";
        return;
      }
      const shade = shadeAt(shades, shot.x, shot.y + offset, shot.radius);
      shot.node.style.opacity = (shot.peak * 0.8 * shade * Math.max(0.5, preset.shots || 0.6)).toFixed(3);
    });
    drifters.forEach((d) => {
      const shade = shadeAt(shades, d.x, d.y + offset, d.radius);
      d.node.style.opacity = (d.peak * preset.drift * shade).toFixed(3);
    });
  };

  measure();

  if (still) {
    compose();
    layer.dataset.ready = "";
    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        shadeStill();
      });
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        pending = 0;
        measure();
        compose();
      });
    });
    observer.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll);
      layer.replaceChildren();
      delete layer.dataset.ready;
      delete layer.dataset.still;
    };
  }

  /* Motion ---------------------------------------------------------------- */

  const start = performance.now();
  // Bursts: a queue of launch times; the first arrives soon after load.
  const queue: { at: number; direction: number; near: boolean }[] = [];
  let nextBurst = 0.5;
  let nextGlint = 4 + r() * 4;
  const level = { shots: base.shots, dust: base.dust, drift: base.drift, nebula: base.nebula };

  const scheduleBurst = (t: number, preset: Preset) => {
    const moment = r() < preset.moment;
    const [b0, b1] = preset.burst;
    const count = moment ? 4 + Math.floor(r() * 3) : b0 + Math.floor(r() * (b1 - b0 + 1));
    const direction = r() < 0.62 ? 1 : -1;
    let at = t;
    for (let i = 0; i < count; i++) {
      queue.push({ at, direction, near: moment ? i < 2 : r() < 0.3 });
      at += 0.12 + r() * (moment ? 0.35 : 0.6);
    }
    if (moment && t >= nextGlint - 6) {
      sweep(0.9);
      nextGlint = t + 12 + r() * 10;
    }
    const [g0, g1] = preset.gap;
    // Quiet periods: now and then a longer pause.
    nextBurst = at + g0 + r() * (g1 - g0) + (r() < 0.2 ? g1 : 0);
  };

  // A few drifting characters and specks are already there on the first frame.
  drifters.forEach((d) => {
    d.born = -r() * d.life * 0.6;
  });

  /* Pointer: a soft light only, nothing follows it. */
  const pointer = { x: -1e4, y: -1e4, active: false };
  const glow = { x: -1e4, y: -1e4, strength: 0 };
  const onMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY - (rootTop - scrollY + stageTop());
    pointer.active = true;
    if (glow.x < -1e3) {
      glow.x = pointer.x;
      glow.y = pointer.y;
    }
  };
  const onLeave = () => {
    pointer.active = false;
  };

  let frame = 0;
  let running = false;
  let previous = start;
  let lastScroll = -1;
  let resized = 0;
  let levelWritten = "";

  const render = (now: number) => {
    const t = (now - start) / 1000;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const ease = (rate: number) => Math.min(1, dt * rate);
    const offset = stageTop();
    const preset = presetAt(offset + viewH * 0.5);

    level.shots += (preset.shots - level.shots) * ease(1.2);
    level.dust += (preset.dust - level.dust) * ease(1.2);
    level.drift += (preset.drift - level.drift) * ease(1.2);
    level.nebula += (preset.nebula - level.nebula) * ease(1.2);
    const written = `${level.nebula.toFixed(2)}|${level.dust.toFixed(2)}`;
    if (written !== levelWritten) {
      levelWritten = written;
      nebulae.style.opacity = level.nebula.toFixed(2);
      dustFar.style.opacity = dustNear.style.opacity = level.dust.toFixed(2);
    }

    // Dust shifts a little with the scroll, the far tile less than the near one.
    const scroll = scrollY;
    if (scroll !== lastScroll) {
      lastScroll = scroll;
      dustFar.style.transform = `translate3d(0, ${(-mod(scroll * 0.04, viewH)).toFixed(1)}px, 0)`;
      dustNear.style.transform = `translate3d(0, ${(-mod(scroll * 0.1, viewH)).toFixed(1)}px, 0)`;
    }

    if (lightable) {
      glow.x += (pointer.x - glow.x) * ease(3);
      glow.y += (pointer.y - glow.y) * ease(3);
      glow.strength += ((pointer.active ? 1 : 0) - glow.strength) * ease(1.4);
      light.style.transform = `translate3d(${glow.x.toFixed(1)}px, ${glow.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      light.style.opacity = (glow.strength * 0.7).toFixed(3);
    }

    // Midground: slow characters that fade in, glide and fade out.
    drifters.forEach((d) => {
      let age = t - d.born;
      if (age > d.life) {
        placeDrifter(d, t, false);
        age = 0;
      }
      const fade = Math.min(smooth(clamp01(age / 4)), smooth(clamp01((d.life - age) / 5)));
      const x = mod(d.x + d.vx * age + 60, width + 120) - 60;
      const y = mod(d.y + d.vy * age - scroll * d.par + 60, viewH + 120) - 60;
      let lit = 0;
      if (lightable && glow.strength > 0.01) {
        const near = Math.max(0, 1 - Math.hypot(x - glow.x, y - glow.y) / 280);
        lit = near * near * glow.strength;
      }
      const shade = shadeAt(shades, x, y + offset, d.radius);
      d.node.style.opacity = (fade * shade * Math.min(1, d.peak * level.drift + lit * 0.18)).toFixed(3);
      d.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    });

    // Bursts and their staggered launches; new characters need text layout, so two per frame at most.
    if (t >= nextBurst && level.shots > 0.05) scheduleBurst(t, preset);
    let spawns = 2;
    const limit = Math.max(1, Math.round(device.pool * Math.min(1, level.shots + 0.15)));
    let flying = shots.reduce((n, s) => n + (s.state > 0 ? 1 : 0), 0);
    while (queue.length && queue[0].at <= t && spawns > 0) {
      const next = queue.shift()!;
      const idle = shots.find((s) => s.state < 0);
      if (!idle || flying >= limit) continue;
      launch(idle, next.direction, next.near);
      spawns--;
      flying++;
    }
    if (t >= nextGlint + 14) {
      // Even without a strong moment the glint returns, rarely.
      sweep(0.55);
      nextGlint = t + 16 + r() * 14;
    }

    shots.forEach((shot) => {
      if (shot.state < 0) return;
      shot.age += dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.travelled += shot.speed * dt;
      const fadeIn = smooth(clamp01(shot.age / 0.35));
      const fadeOut = shot.travelled > shot.reach ? 1 - smooth(clamp01((shot.travelled - shot.reach) / (shot.speed * 0.6))) : 1;
      const gone = fadeOut <= 0 || shot.y - shot.len > viewH + 40 || shot.x < -shot.len - 60 || shot.x > width + shot.len + 60;
      if (gone) {
        shot.state = -1;
        shot.node.style.opacity = "0";
        return;
      }
      // The trail grows from the head as it enters, then keeps its length.
      const grow = Math.round(Math.min(1, shot.travelled / shot.len) * 100) / 100;
      const dirX = Math.cos(shot.angle);
      const dirY = Math.sin(shot.angle);
      const mid = (shot.len * grow) / 2;
      const shade =
        0.5 * shadeAt(shades, shot.x, shot.y + offset, shot.radius) + 0.5 * shadeAt(shades, shot.x - dirX * mid, shot.y - dirY * mid + offset, 4);
      const opacity = fadeIn * fadeOut * shade * shot.peak * (0.55 + 0.45 * level.shots);
      shot.node.style.opacity = opacity.toFixed(3);
      shot.node.style.transform = `translate3d(${shot.x.toFixed(1)}px, ${shot.y.toFixed(1)}px, 0)`;
      if (grow !== shot.grow) {
        shot.grow = grow;
        shot.trail.style.transform = `rotate(${shot.angle.toFixed(4)}rad) scaleX(${grow})`;
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

  // Re-measure when the layout or the viewport changes (fonts, content, rotation).
  const onResize = () => {
    clearTimeout(resized);
    resized = window.setTimeout(() => {
      if (measure()) drifters.forEach((d) => (d.born = -r() * d.life * 0.6));
    }, 150);
  };
  const observer = new ResizeObserver(onResize);
  observer.observe(root);
  window.addEventListener("resize", onResize);

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
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    layer.replaceChildren();
    delete layer.dataset.ready;
  };
};
