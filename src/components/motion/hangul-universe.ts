/*
  Hangul Universe (8 Oct 2026): dimensional Hangul characters in space around
  the page's content. Framework-free so the Home and its review preview run the
  same code.

  Motion principles taken from Google's Language Explorer (inspected 8 Oct):
  the scene rises out of darkness, the farthest lights first; a camera moves
  forward through the field with a slow start and a slow end, so characters
  grow and spread outwards with parallax (near ones faster); depth of field
  keeps the middle distance sharp and softens what is very near or very far;
  once settled, a slow, never-repeating camera drift keeps everything alive.

  The descent is this site's own idea (not Language Explorer's): while the
  reader scrolls down, selected characters sink through the page a little
  faster than the content and come to rest near the bottom of a later section,
  where they stay. Scrolling back up plays it in reverse.
*/

export type Tone = "gold" | "ivory";

/** Where a character comes to rest: a section's bottom edge, `x` a fraction of its width, `lift` in its own heights. */
export type Rest = { section: string; x: number; lift: number; z: number; size: number; rot: number };

/** A character in a section's space, in fractions of the section box. */
export type SpaceGlyph = {
  g: string;
  x: number;
  y: number;
  /** 0 far .. 1 near the viewer. */
  z: number;
  /** Height as a fraction of the smaller viewport side. */
  size: number;
  rot: number;
  tone: Tone;
  /** Descends while the page scrolls and settles here. */
  fall?: Rest;
};

export type UniverseScene = {
  /** data-story key of the section the characters start in. */
  section: string;
  space: SpaceGlyph[];
};

export type UniverseOptions = {
  scenes: { desktop: UniverseScene[]; tablet: UniverseScene[]; mobile: UniverseScene[] };
};

type Mode = "desktop" | "tablet" | "mobile";
type Box = { left: number; top: number; width: number; height: number };

/** Seconds the opening takes, and how long the light takes to rise before the first character shows. */
const INTRO_SECONDS = 3.4;
/** Where the camera starts behind its resting place, in depth units. */
const INTRO_DOLLY = 4.2;
/** Depth units: the resting distance of the farthest and the nearest character. */
const FAR = 5.2;
const NEAR = 1.35;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (v: number) => v * v * (3 - 2 * v);
/** Slow start and slow end, like the reference's camera. */
const slowInOut = (v: number) => {
  const a = v ** 1.6;
  return 1 - (1 - a) ** 2.2;
};

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

/** Content a character must never cover once it is at rest: copy, controls and cards. */
const CONTENT = "h1, h2, h3, p, dl, ol, ul, figure, a, button, article, [data-atmo-glass], [data-hu-avoid]";

const overlaps = (a: Box, b: Box, pad: number) =>
  a.left < b.left + b.width + pad && a.left + a.width + pad > b.left && a.top < b.top + b.height + pad && a.top + a.height + pad > b.top;

/** Depth of field: the middle distance is sharp, very near and very far characters soften. Quantised to few steps. */
const blurFor = (z: number) => {
  const amount = z > 0.8 ? (z - 0.8) * 30 : z < 0.22 ? (0.22 - z) * 7 : 0;
  return Math.round(amount * 2) / 2;
};
/** Far characters sit in the dark; near ones catch the light. */
const brightnessFor = (z: number) => 0.4 + 0.6 * clamp01(z * 1.5);

/** A slow, never-repeating wander (sum of unrelated sines). */
const wander = (t: number, seed: number) =>
  Math.sin(t * 0.13 + seed) * 0.6 + Math.sin(t * 0.071 + seed * 2.3) * 0.3 + Math.sin(t * 0.193 + seed * 0.7) * 0.1;

type Item = {
  node: HTMLElement;
  glyph: SpaceGlyph;
  /** Resting place in page coordinates and its size in px. */
  x: number;
  y: number;
  px: number;
  /** Vanishing point the character grows out of during the opening. */
  vx: number;
  vy: number;
  /** When the opening reaches it (0..1 of the opening), farthest first. */
  start: number;
  fall?: { x: number; y: number; px: number; z: number; rot: number; from: number; to: number };
  /** Offset of the frame it is drawn in (characters that stay in their section are cropped by it). */
  ox: number;
  oy: number;
  /** Last blur written, to avoid needless filter changes. */
  blur: number;
  seed: number;
};

/** Starts the universe in `layer`, tied to the sections of `root`. Returns a stop function. */
export const startHangulUniverse = (layer: HTMLElement, root: HTMLElement, options: UniverseOptions) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  let items: Item[] = [];
  let viewH = innerHeight;
  let unit = 1;
  let rootTop = 0;

  const field = document.createElement("div");
  field.className = "hu-field";
  layer.replaceChildren(field);

  const make = (glyph: SpaceGlyph) => {
    const node = document.createElement("span");
    node.className = "hu-glyph";
    node.dataset.g = glyph.g;
    node.dataset.tone = glyph.tone;
    return node;
  };

  const sectionBox = (key: string) => {
    const el = root.querySelector<HTMLElement>(`[data-story="${key}"]`);
    return el ? boxIn(el, root) : null;
  };

  /** Layout: resting places, falls and safe areas. Rebuilt on resize. */
  const build = () => {
    const wide = matchMedia("(min-width: 1024px)").matches;
    const mid = matchMedia("(min-width: 640px)").matches;
    const mode: Mode = wide ? "desktop" : mid ? "tablet" : "mobile";
    viewH = innerHeight;
    unit = Math.min(root.offsetWidth, viewH);
    rootTop = root.getBoundingClientRect().top + scrollY;
    const blocked = Array.from(root.querySelectorAll<HTMLElement>(CONTENT))
      .filter((el) => !el.closest(".hangul-universe") && el.offsetWidth)
      .map((el) => boxIn(el, root));

    /** Slides a point sideways, away from the centre, until a character there clears the content. */
    const clear = (x: number, y: number, px: number, away: number) => {
      for (let i = 0; i < 60; i++) {
        const glyph = { left: x - px * 0.42, top: y - px * 0.42, width: px * 0.84, height: px * 0.84 };
        if (!blocked.some((b) => overlaps(glyph, b, 10))) return x;
        x += away * px * 0.2;
      }
      return x;
    };

    const next: Item[] = [];
    const nodes: HTMLElement[] = [];
    options.scenes[mode].forEach((scene, sceneIndex) => {
      const box = sectionBox(scene.section);
      if (!box) return;
      // Characters that stay in this section are drawn in a frame the size of it, so its edges crop them.
      const frame = document.createElement("div");
      frame.className = "hu-scene";
      frame.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
      frame.style.width = `${box.width}px`;
      frame.style.height = `${box.height}px`;
      nodes.push(frame);
      scene.space.forEach((glyph, i) => {
        const px = glyph.size * unit;
        const side = Math.sign(glyph.x - 0.5) || 1;
        let x = box.left + glyph.x * box.width;
        const y = box.top + glyph.y * box.height;
        // Near, blurred characters may pass the edge of the copy; the sharp ones keep clear of it.
        if (glyph.z <= 0.8) x = clear(x, y, px, side);
        const node = make(glyph);
        node.style.fontSize = `${px.toFixed(1)}px`;
        const item: Item = {
          node,
          glyph,
          x,
          y,
          px,
          vx: box.left + box.width * (side < 0 ? 0.3 : 0.7),
          vy: box.top + box.height * 0.5,
          start: (1 - glyph.z) * 0.45 + (i % 3) * 0.03,
          ox: 0,
          oy: 0,
          blur: -1,
          seed: sceneIndex * 17 + i * 3.1,
        };
        if (glyph.fall) {
          const to = sectionBox(glyph.fall.section);
          if (to) {
            const fpx = glyph.fall.size * unit;
            const fy = to.top + to.height - fpx * (0.5 + glyph.fall.lift);
            const fx = clear(to.left + glyph.fall.x * to.width, fy, fpx, Math.sign(glyph.fall.x - 0.5) || 1);
            // The descent starts with the first scroll and ends with the character low in the viewport,
            // so it is seen landing; each one keeps its own pace.
            const from = Math.max(0, y - viewH * 0.85) + (i % 4) * 40;
            const landAt = 0.72 + ((i * 7) % 5) * 0.035;
            const to_ = Math.max(from + viewH * 0.4, fy - viewH * landAt);
            item.fall = { x: fx, y: fy, px: fpx, z: glyph.fall.z, rot: glyph.fall.rot, from: Math.min(from, to_ - 1), to: to_ };
          }
        }
        if (item.fall) nodes.push(node);
        else {
          item.ox = box.left;
          item.oy = box.top;
          frame.appendChild(node);
        }
        next.push(item);
      });
    });
    items = next;
    field.replaceChildren(...nodes);
  };

  /** Writes one character's state. */
  const paint = (item: Item, x: number, y: number, scale: number, rot: number, z: number, opacity: number) => {
    const blur = blurFor(z);
    if (blur !== item.blur) {
      item.blur = blur;
      item.node.style.filter = blur > 0 ? `blur(${blur}px)` : "";
      item.node.style.zIndex = String(Math.round(z * 10));
    }
    item.node.style.opacity = opacity < 0.004 ? "0" : opacity.toFixed(3);
    item.node.style.transform = `translate3d(${(x - item.ox).toFixed(1)}px, ${(y - item.oy).toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  };

  /** The whole scene for intro progress `intro`, scroll `s`, camera drift `cam` (px) and time `t`. */
  const draw = (intro: number, s: number, camX: number, camY: number, t: number) => {
    for (const item of items) {
      const g = item.glyph;
      // Opening: the camera moves forward; each character grows out of its vanishing point as it is reached.
      const local = slowInOut(clamp01((intro - item.start) / (1 - item.start)));
      const dist = lerp(FAR, NEAR, g.z);
      const persp = dist / (dist + INTRO_DOLLY * (1 - local));
      let x = lerp(item.vx, item.x, persp);
      let y = lerp(item.vy, item.y, persp);
      let scale = persp;
      let rot = g.rot;
      let z = g.z;
      // Light rises out of the dark: far characters stay dimmer.
      let opacity = brightnessFor(g.z) * smooth(clamp01(local * 1.6));

      // Descent: sinks through the page a little faster than the content, then lands softly.
      if (item.fall) {
        const f = item.fall;
        const p = clamp01((s - f.from) / (f.to - f.from));
        const e = 1 - (1 - p) ** 2;
        // It reaches its side of the page early, so it passes beside the copy rather than through it.
        const ex = smooth(clamp01(p * 2.2));
        const sway = Math.sin(p * Math.PI) * item.px * 0.25 * Math.sign(f.x - item.x || 1);
        x = lerp(x, f.x, ex) + sway;
        y = lerp(y, f.y, e);
        scale *= lerp(1, f.px / item.px, smooth(p));
        rot = lerp(rot, f.rot, smooth(p)) + Math.sin(p * Math.PI) * 14;
        z = lerp(z, f.z, smooth(p));
        opacity = lerp(opacity, brightnessFor(f.z), smooth(p));
      }

      // Camera drift and pointer: parallax by depth, near characters move most. Settled ones stay put.
      const settled = item.fall ? clamp01((s - item.fall.from) / (item.fall.to - item.fall.from)) : 0;
      const depth = (z - 0.5) * 2;
      const still = 1 - settled;
      x += (camX * depth + wander(t, item.seed) * unit * 0.004) * still;
      y += (camY * depth + wander(t, item.seed + 9) * unit * 0.004) * still;
      rot += wander(t * 0.8, item.seed + 4) * 2.5 * still;

      // Skip work far outside the viewport.
      if (y + item.px < s - viewH * 0.5 || y - item.px > s + viewH * 1.5) {
        if (item.node.style.opacity !== "0") item.node.style.opacity = "0";
        continue;
      }
      paint(item, x, y, scale, rot, z, opacity);
    }
  };

  /* Reduced motion: the resting compositions, still. Hero characters stay where they are; the settled
     compositions are drawn too, so every section keeps its arrangement. */
  const compose = () => {
    const extra: HTMLElement[] = [];
    for (const item of items) {
      paint(item, item.x, item.y, 1, item.glyph.rot, item.glyph.z, brightnessFor(item.glyph.z));
      if (item.fall) {
        const twin = make(item.glyph);
        twin.style.fontSize = `${item.fall.px.toFixed(1)}px`;
        const ghost: Item = { ...item, node: twin, ox: 0, oy: 0, blur: -1 };
        paint(ghost, item.fall.x, item.fall.y, 1, item.fall.rot, item.fall.z, brightnessFor(item.fall.z));
        extra.push(twin);
      }
    }
    field.append(...extra);
  };

  build();
  layer.dataset.ready = "";

  if (reduced) {
    compose();
    let pending = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        build();
        compose();
      });
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
      layer.replaceChildren();
      delete layer.dataset.ready;
    };
  }

  // The opening plays once per page load; arriving further down the page skips it.
  const begun = performance.now();
  let intro = scrollY > viewH * 0.6 ? 1 : 0;
  let s = Math.max(0, scrollY - rootTop);
  let camX = 0;
  let camY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let previous = begun;
  let frame = 0;
  let running = false;

  const onPointer = (event: PointerEvent) => {
    pointerX = event.clientX / innerWidth - 0.5;
    pointerY = event.clientY / innerHeight - 0.5;
  };
  if (finePointer) addEventListener("pointermove", onPointer, { passive: true });

  const render = (now: number) => {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const t = (now - begun) / 1000;
    if (intro < 1) intro = Math.min(1, intro + dt / INTRO_SECONDS);
    // The scroll is followed with a light lag so the descent glides.
    const target = Math.max(0, scrollY - rootTop);
    s += (target - s) * Math.min(1, dt * 7);
    if (Math.abs(target - s) < 0.5) s = target;
    // Camera drift eases in after the opening, as in the reference; the pointer nudges it a little.
    const drift = smooth(clamp01((intro - 0.85) / 0.15));
    const wantX = (wander(t * 0.5, 1) * 10 + pointerX * 8) * drift;
    const wantY = (wander(t * 0.5, 5) * 7 + pointerY * 6) * drift;
    camX += (wantX - camX) * Math.min(1, dt * 2);
    camY += (wantY - camY) * Math.min(1, dt * 2);
    draw(intro, s, camX, camY, t);
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

  render(begun);
  play();

  let resized = 0;
  const onResize = () => {
    clearTimeout(resized);
    resized = window.setTimeout(build, 150);
  };
  const observer = new ResizeObserver(onResize);
  observer.observe(root);
  const onVisibility = () => (document.hidden ? pause() : play());
  document.addEventListener("visibilitychange", onVisibility);
  document.fonts?.ready.then(build).catch(() => {});

  return () => {
    pause();
    clearTimeout(resized);
    observer.disconnect();
    removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    layer.replaceChildren();
    delete layer.dataset.ready;
  };
};
