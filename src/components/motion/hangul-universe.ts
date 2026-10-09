/*
  Hero Hangul (9 Oct 2026, replaces the falling Hangul universe): Crystal Blue
  Glass characters placed deliberately around the centred hero copy, at
  varied size and depth. Framework-free so the Home and its review preview
  run the same code.

  - They appear one after another while the hero copy is introduced (the
    copy's own CSS entrance runs from 0.45 s to about 2.8 s).
  - Once there, each floats very slowly, a few pixels up and down with a
    gentle turn, and on desktop the pointer adds a restrained parallax, more
    for near characters than far ones.
  - Scrolling away from the hero, they recede into depth: they drift back
    towards the centre, shrink a little and fade, far ones first. Nothing
    travels across the rest of the page.
  - Reduced motion: the composition is drawn once and stays still.
  The material (filter, tokens) lives in crystal-glass.tsx and globals.css.
*/

/** A character in the hero, in fractions of the hero box. */
export type HeroGlyph = {
  g: string;
  x: number;
  y: number;
  /** 0 far .. 1 near the viewer. */
  z: number;
  /** Height as a fraction of the smaller viewport side. */
  size: number;
  rot: number;
};

export type UniverseOptions = {
  /** data-story key of the section the characters surround. */
  section: string;
  scenes: { desktop: HeroGlyph[]; tablet: HeroGlyph[]; mobile: HeroGlyph[] };
};

type Box = { left: number; top: number; width: number; height: number };

/** Content a character must never cover: copy, controls and the header's links. */
const CONTENT = "h1, h2, h3, p, a, button";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const easeOut = (v: number) => 1 - (1 - v) ** 3;

const overlaps = (a: Box, b: Box, pad: number) =>
  a.left < b.left + b.width + pad && a.left + a.width + pad > b.left && a.top < b.top + b.height + pad && a.top + a.height + pad > b.top;

/** Box of `el` relative to `root`. */
const boxIn = (el: Element, root: HTMLElement): Box => {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
};

/** Same thresholds as crystalSize() in crystal-glass.tsx. */
const sizeClass = (px: number) => (px < 70 ? "s" : px < 150 ? "m" : "l");

/** Far characters are softer and a little dimmer; the middle distance is sharp. */
const blurFor = (z: number) => (z > 0.85 ? Math.round((z - 0.85) * 40) / 2 : z < 0.3 ? Math.round((0.3 - z) * 12) / 2 : 0);
const brightnessFor = (z: number) => 0.55 + 0.45 * clamp01(z * 1.4);

type Item = {
  outer: HTMLElement;
  glyph: HeroGlyph;
  x: number;
  y: number;
  px: number;
  /** Seconds after load when it starts to appear. */
  delay: number;
  period: number;
  seed: number;
};

/** Seconds a character takes to appear. */
const APPEAR = 1.6;

/** Starts the hero characters in `layer`, placed around `root`'s hero section. Returns a stop function. */
export const startHangulUniverse = (layer: HTMLElement, root: HTMLElement, options: UniverseOptions) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  let items: Item[] = [];
  let hero: Box = { left: 0, top: 0, width: 1, height: 1 };

  const field = document.createElement("div");
  field.className = "hu-field";
  layer.replaceChildren(field);

  const build = () => {
    const section = root.querySelector<HTMLElement>(`[data-story="${options.section}"]`);
    if (!section) return;
    hero = boxIn(section, root);
    const mode = matchMedia("(min-width: 1024px)").matches ? "desktop" : matchMedia("(min-width: 640px)").matches ? "tablet" : "mobile";
    const unit = Math.min(root.offsetWidth, innerHeight);
    const blocked = [
      ...Array.from(section.querySelectorAll(CONTENT)).map((el) => boxIn(el, root)),
      // The header sits over the top of the hero; its links get a wider margin.
      ...Array.from(document.querySelectorAll(".site-header a, .site-header button"))
        .filter((el) => (el as HTMLElement).offsetWidth)
        .map((el) => {
          const b = boxIn(el, root);
          return { left: b.left - 28, top: b.top - 20, width: b.width + 56, height: b.height + 40 };
        }),
    ];

    /** Slides a character sideways, away from the centre, until it clears the content. */
    const clear = (x: number, y: number, px: number, away: number) => {
      for (let i = 0; i < 60; i++) {
        const glyph = { left: x - px * 0.45, top: y - px * 0.45, width: px * 0.9, height: px * 1.05 };
        if (!blocked.some((b) => overlaps(glyph, b, 16))) return x;
        x += away * px * 0.15;
      }
      return x;
    };

    // Nearest first, so the large characters lead the reveal and the far ones follow.
    const order = options.scenes[mode].map((glyph, i) => ({ glyph, i })).sort((a, b) => b.glyph.z - a.glyph.z);
    items = order.map(({ glyph, i }, rank) => {
      const px = glyph.size * unit;
      const side = Math.sign(glyph.x - 0.5) || 1;
      const y = hero.top + glyph.y * hero.height;
      const x = clear(hero.left + glyph.x * hero.width, y, px, side);
      const outer = document.createElement("span");
      outer.className = "hu-glyph";
      const inner = document.createElement("span");
      inner.className = "crystal";
      inner.dataset.crystal = sizeClass(px);
      inner.textContent = glyph.g;
      const blur = blurFor(glyph.z);
      if (blur) inner.style.setProperty("--crystal-blur", `${blur}px`);
      outer.style.fontSize = `${px.toFixed(1)}px`;
      outer.style.zIndex = String(Math.round(glyph.z * 10));
      outer.appendChild(inner);
      return { outer, glyph, x, y, px, delay: 0.2 + rank * 0.12, period: 9 + ((i * 7) % 6), seed: i * 1.7 };
    });
    field.replaceChildren(...items.map((item) => item.outer));
  };

  /** Writes one character for time `t` (s), scroll progress `p` (0 in the hero .. 1 past it) and pointer offset. */
  const paint = (item: Item, t: number, p: number, px: number, py: number) => {
    const g = item.glyph;
    const appear = easeOut(clamp01((t - item.delay) / APPEAR));
    // Float: a slow rise and fall of a few pixels, with a gentle turn.
    const wave = Math.sin((t / item.period) * Math.PI * 2 + item.seed);
    const float = wave * (3 + g.z * 4);
    const turn = Math.sin((t / (item.period * 1.3)) * Math.PI * 2 + item.seed * 2) * 1.6;
    // Receding: towards the hero's centre and into depth; far characters go first.
    const r = smooth(clamp01(p * (1.5 - g.z * 0.6)));
    const cx = hero.left + hero.width / 2;
    const cy = hero.top + hero.height * 0.42;
    const depth = g.z - 0.35;
    const x = item.x + (cx - item.x) * r * 0.22 + px * depth * 16;
    const y = item.y + (cy - item.y) * r * 0.22 + float + py * depth * 10 + (1 - appear) * 14;
    const scale = (0.9 + 0.1 * appear) * (1 - r * 0.32);
    const opacity = brightnessFor(g.z) * appear * (1 - r);
    item.outer.style.opacity = opacity < 0.004 ? "0" : opacity.toFixed(3);
    item.outer.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${(g.rot + turn).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  };

  build();
  layer.dataset.ready = "";

  if (reduced) {
    const still = () => items.forEach((item) => paint(item, 1e4, 0, 0, 0));
    // A frozen frame: no float, no turn, no recede.
    const freeze = () => {
      still();
      items.forEach((item) => {
        item.outer.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${item.glyph.rot}deg)`;
      });
    };
    freeze();
    let pending = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        build();
        freeze();
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

  const begun = performance.now();
  // Arriving further down the page skips the reveal.
  const skip = scrollY > innerHeight * 0.6 ? 10 : 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let previous = begun;
  let frame = 0;
  let running = false;

  const onPointer = (event: PointerEvent) => {
    pointerX = event.clientX / innerWidth - 0.5;
    pointerY = event.clientY / innerHeight - 0.5;
  };
  if (finePointer) addEventListener("pointermove", onPointer, { passive: true });

  let hidden = false;
  const render = (now: number) => {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const t = (now - begun) / 1000 + skip;
    easedX += (pointerX - easedX) * Math.min(1, dt * 2.5);
    easedY += (pointerY - easedY) * Math.min(1, dt * 2.5);
    const p = clamp01((scrollY - (root.getBoundingClientRect().top + scrollY) - hero.top) / (hero.height * 0.85));
    // Past the hero there is nothing to draw.
    if (p >= 1) {
      if (!hidden) items.forEach((item) => (item.outer.style.opacity = "0"));
      hidden = true;
    } else {
      hidden = false;
      for (const item of items) paint(item, t, p, easedX, easedY);
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
