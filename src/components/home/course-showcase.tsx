"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

type Paths = Dictionary["home"]["paths"];
type PathKey = "free" | "general" | "topik";

const PATHS: PathKey[] = ["free", "general", "topik"];

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/*
  Course showcase (8 Oct 2026). The interaction follows what the Ciao Energy
  product carousel does, translated to course levels: one selected level sits
  in the centre, lit and upright; its neighbours stay visible along a gentle
  arc, smaller, further back and dimmer. The row glides to a new selection and
  can be dragged directly, a neighbour can be clicked, and previous/next and a
  position track do the same with keyboard or touch. The course details swap
  with a short masked text change. Page scrolling is never taken over.
*/

/** Where a level object sits for its distance from the selected one (fractional while dragging). */
const placement = (offset: number, spread: number) => {
  const distance = Math.min(Math.abs(offset), 3);
  const side = Math.sign(offset);
  // Each step out moves less far, so the row reads as a curve receding into depth.
  const x = side * spread * (distance <= 1 ? distance : 1 + (distance - 1) * 0.62);
  const y = -Math.min(distance, 2.2) * 6;
  const scale = 1 - Math.min(distance, 2.4) * 0.27;
  const rotate = side * Math.min(distance, 2) * 7;
  const opacity = distance < 2.6 ? 1 - Math.min(distance, 2) * 0.36 : Math.max(0, 0.28 - (distance - 2.6) * 0.7);
  const light = 1 - Math.min(distance, 1);
  return { x, y, scale, rotate, opacity, light, z: Math.round(10 - distance * 3) };
};

/*
  Sculptural glass for the level objects (8 Oct 2026). The letter's own shape is
  turned into a soft height map and lit twice: a cool white key light from the
  upper left and a champagne return from the right, plus a thin bright rim.
  The fill underneath stays mostly clear, so the page shows through it.
*/
const glassFilter = (id: string, rim: string, rimOpacity: number, warm: string) => (
  <filter id={id} x="-8%" y="-8%" width="116%" height="124%" colorInterpolationFilters="sRGB">
    <feComponentTransfer in="SourceAlpha" result="shape">
      <feFuncA type="linear" slope="40" />
    </feComponentTransfer>
    <feGaussianBlur in="shape" stdDeviation="5" result="height" />
    <feSpecularLighting in="height" surfaceScale="9" specularConstant="1.25" specularExponent="38" lightingColor="#ffffff" result="key">
      <feDistantLight azimuth="235" elevation="40" />
    </feSpecularLighting>
    <feComposite in="key" in2="shape" operator="in" result="keyLight" />
    <feSpecularLighting in="height" surfaceScale="9" specularConstant="0.85" specularExponent="16" lightingColor={warm} result="return">
      <feDistantLight azimuth="20" elevation="28" />
    </feSpecularLighting>
    <feComposite in="return" in2="shape" operator="in" result="returnLight" />
    <feMorphology in="shape" operator="erode" radius="2" result="inner" />
    <feComposite in="shape" in2="inner" operator="out" result="edge" />
    <feFlood floodColor={rim} floodOpacity={rimOpacity} />
    <feComposite in2="edge" operator="in" result="rim" />
    <feMerge>
      <feMergeNode in="SourceGraphic" />
      <feMergeNode in="rim" />
      <feMergeNode in="returnLight" />
      <feMergeNode in="keyLight" />
    </feMerge>
  </filter>
);

const GlassFilters = () => (
  <svg aria-hidden="true" width="0" height="0" className="absolute">
    {glassFilter("course-glass", "#eef4ff", 0.6, "#f2d29a")}
    {glassFilter("course-glass-light", "#1d3556", 0.42, "#d6a95a")}
  </svg>
);

type StageProps = {
  items: { key: string; label: string; kicker?: string }[];
  selected: number;
  onSelect: (index: number) => void;
  tone: "gold" | "ivory";
};

/** The level objects: a decorative, draggable view of the same choice the controls below make. */
const LevelStage = ({ items, selected, onSelect, tone }: StageProps) => {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null; moved: boolean } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);
    setWidth(element.offsetWidth);
    return () => observer.disconnect();
  }, []);

  const spread = Math.max(120, Math.min(width * 0.34, 290));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, horizontal: null, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    // Decide once whether this gesture is a horizontal drag; vertical ones stay page scrolls.
    if (state.horizontal === null && Math.hypot(dx, dy) > 6) {
      state.horizontal = Math.abs(dx) > Math.abs(dy);
      if (state.horizontal) stage.current?.setPointerCapture(event.pointerId);
    }
    if (!state.horizontal) return;
    state.moved = true;
    const next = -dx / spread;
    // Resist past the first and last level.
    const limit = (value: number) => {
      const target = selected + value;
      if (target < 0) return value - target * 0.65;
      if (target > items.length - 1) return value - (target - items.length + 1) * 0.65;
      return value;
    };
    setDragOffset(limit(next));
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    if (state.moved) {
      const target = Math.max(0, Math.min(items.length - 1, Math.round(selected + dragOffset)));
      onSelect(target);
    }
    setDragOffset(0);
  };

  const position = selected + dragOffset;

  return (
    <div
      ref={stage}
      aria-hidden="true"
      data-hu-avoid
      className={cn("course-stage", dragOffset !== 0 && "is-dragging")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <span className="course-stage-light" />
      {items.map((item, index) => {
        const p = placement(index - position, spread);
        return (
          <div
            key={item.key}
            className="course-object"
            data-tone={tone}
            data-current={index === selected ? "" : undefined}
            style={{
              transform: `translate(-50%, -50%) translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.rotate.toFixed(2)}deg) scale(${p.scale.toFixed(3)})`,
              opacity: p.opacity,
              zIndex: p.z,
              ["--lit" as string]: p.light.toFixed(3),
              ["--turn" as string]: Math.max(-1.5, Math.min(1.5, index - position)).toFixed(3),
            }}
            onClick={() => {
              if (drag.current?.moved) return;
              if (index !== selected) onSelect(index);
            }}
          >
            {item.kicker ? <span className="course-object-kicker">{item.kicker}</span> : null}
            <span className="course-object-face" data-text={item.label}>
              <span className="course-object-glass">{item.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Position track and direct selection: real buttons, the accessible way to choose a level. */
const LevelControls = ({
  t,
  labels,
  names,
  selected,
  onSelect,
  groupLabel,
}: {
  t: Paths;
  labels: string[];
  names: string[];
  selected: number;
  onSelect: (index: number) => void;
  groupLabel: string;
}) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (index: number) => {
    const next = Math.max(0, Math.min(labels.length - 1, index));
    onSelect(next);
    buttons.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: labels.length - 1 };
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          className="course-arrow"
          onClick={() => onSelect(selected - 1)}
          disabled={selected === 0}
          aria-label={`${t.previous}: ${selected > 0 ? names[selected - 1] : ""}`}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div role="group" aria-label={groupLabel} className="course-track" onKeyDown={onKeyDown}>
          <span
            aria-hidden="true"
            className="course-track-dot"
            style={{ left: `calc(${((selected + 0.5) / labels.length) * 100}% )` }}
          />
          {labels.map((label, index) => (
            <button
              key={label}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              aria-pressed={index === selected}
              aria-label={names[index]}
              tabIndex={index === selected ? 0 : -1}
              className="course-chip"
              onClick={() => onSelect(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="course-arrow"
          onClick={() => onSelect(selected + 1)}
          disabled={selected === labels.length - 1}
          aria-label={`${t.next}: ${selected < labels.length - 1 ? names[selected + 1] : ""}`}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="text-caption tabular-nums text-text-muted" aria-hidden="true">
        {fill(t.position, { n: selected + 1, total: labels.length })}
      </p>
    </div>
  );
};

/** ㅎ, ㅏ and ㄴ slide into one block and become 한. */
const JamoStage = ({ label, replay, run, onReplay }: { label: string; replay: string; run: number; onReplay: () => void }) => (
  <div className="flex w-full flex-col items-center gap-5">
    <div key={run} className="jamo-stage w-full" data-hu-avoid role="img" aria-label={label}>
      <span className="course-stage-light" aria-hidden="true" />
      <span lang="ko" aria-hidden="true" className="jamo jamo-h">ㅎ</span>
      <span lang="ko" aria-hidden="true" className="jamo jamo-a">ㅏ</span>
      <span lang="ko" aria-hidden="true" className="jamo jamo-n">ㄴ</span>
      {/* ㅎ ㅏ ㄴ become 한, then 글 joins: 한글 in the same glass as the level objects. */}
      <span lang="ko" aria-hidden="true" className="jamo-word">
        <span className="course-object-face jamo-syllable" data-text="한">
          <span className="course-object-glass">한</span>
        </span>
        <span className="course-object-face jamo-syllable is-late" data-text="글">
          <span className="course-object-glass">글</span>
        </span>
      </span>
    </div>
    <p lang="ko" className="text-caption tracking-[0.14em] text-text-muted" aria-hidden="true">
      {label}
    </p>
    <button type="button" className="course-link" onClick={onReplay}>
      {replay}
    </button>
  </div>
);

type Detail = { label: string; value: string; muted?: boolean };

const DetailList = ({ items }: { items: Detail[] }) => (
  <dl className="flex flex-col gap-4">
    {items.map((item) => (
      <div key={item.label} className="flex flex-col gap-1">
        <dt className="course-label">{item.label}</dt>
        <dd className={cn("text-body-sm", item.muted ? "text-text-muted" : "text-text")}>{item.value}</dd>
      </div>
    ))}
  </dl>
);

export const CourseShowcase = ({ t, base }: { t: Paths; base: string }) => {
  const id = useId();
  const [path, setPath] = useState<PathKey>("free");
  const [levels, setLevels] = useState({ general: 0, topik: 0 });
  const [jamoRun, setJamoRun] = useState(0);
  const [announce, setAnnounce] = useState("");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const general = t.general.levels[levels.general];
  const topik = t.topik.levels[levels.topik];

  const choosePath = (next: PathKey) => {
    setPath(next);
    if (next === "free") setJamoRun((run) => run + 1);
  };

  const chooseLevel = (track: "general" | "topik", index: number) => {
    const list = t[track].levels;
    const next = Math.max(0, Math.min(list.length - 1, index));
    setLevels((current) => ({ ...current, [track]: next }));
    const level = list[next];
    const name = track === "general" ? `${t.general.title} ${level.code}` : `${t.topik.title}, ${t.topik.courseWord} ${level.code}`;
    setAnnounce(`${fill(t.selected, { name })}. ${level.price}`);
  };

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % PATHS.length,
      ArrowLeft: (index - 1 + PATHS.length) % PATHS.length,
      Home: 0,
      End: PATHS.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = keys[event.key];
    choosePath(PATHS[next]);
    tabs.current[next]?.focus();
  };

  const tabLabel: Record<PathKey, string> = { free: t.free.tab, general: t.general.tab, topik: t.topik.tab };

  return (
    <div data-course-showcase className="course-showcase flex flex-col gap-8 lg:gap-10">
      <GlassFilters />
      <div role="tablist" aria-label={t.pathsLabel} className="course-tabs">
        {PATHS.map((key, index) => (
          <button
            key={key}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={`${id}-tab-${key}`}
            role="tab"
            type="button"
            aria-selected={path === key}
            aria-controls={`${id}-panel`}
            tabIndex={path === key ? 0 : -1}
            className="course-tab"
            onClick={() => choosePath(key)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            <span>{tabLabel[key]}</span>
            {key === "free" ? <span className="course-tab-note">{t.free.badge}</span> : null}
          </button>
        ))}
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${path}`}
        className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10"
      >
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          {path === "free" ? (
            <JamoStage label={t.free.visualLabel} replay={t.free.replay} run={jamoRun} onReplay={() => setJamoRun((run) => run + 1)} />
          ) : path === "general" ? (
            <>
              <p lang="ko" aria-hidden="true" className="course-korean">
                {t.general.korean}
              </p>
              <LevelStage
                tone="gold"
                selected={levels.general}
                onSelect={(index) => chooseLevel("general", index)}
                items={t.general.levels.map((level) => ({ key: level.code, label: level.code }))}
              />
              <LevelControls
                t={t}
                groupLabel={t.general.levelsLabel}
                labels={t.general.levels.map((level) => level.code)}
                names={t.general.levels.map((level) => `${level.code} · ${level.name}`)}
                selected={levels.general}
                onSelect={(index) => chooseLevel("general", index)}
              />
            </>
          ) : (
            <>
              <p lang="ko" aria-hidden="true" className="course-korean">
                {t.topik.korean}
              </p>
              <LevelStage
                tone="ivory"
                selected={levels.topik}
                onSelect={(index) => chooseLevel("topik", index)}
                items={t.topik.levels.map((level) => ({ key: level.code, label: level.code, kicker: "TOPIK" }))}
              />
              <LevelControls
                t={t}
                groupLabel={t.topik.levelsLabel}
                labels={t.topik.levels.map((level) => level.code)}
                names={t.topik.levels.map((level) => `${t.topik.courseWord} ${level.code}`)}
                selected={levels.topik}
                onSelect={(index) => chooseLevel("topik", index)}
              />
            </>
          )}
        </div>

        <div className="min-w-0 lg:col-span-5">
          {path === "free" ? (
            <article key="free" data-atmo-glass className="glass-panel glass-lead course-info flex flex-col gap-7 rounded-(--radius-card) p-6 sm:p-9">
              <header className="flex flex-col gap-3">
                <p className="course-eyebrow">{t.free.kicker}</p>
                <h3 className="course-swap display-headline text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight text-text">{t.free.title}</h3>
                <p className="text-body text-text">{t.free.body}</p>
              </header>
              <div className="flex flex-col gap-3">
                <p className="course-label">{t.free.includesLabel}</p>
                <ul className="flex flex-wrap gap-2">
                  {t.free.includes.map((step) => (
                    <li key={step} className="course-item">
                      {step}
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-text-muted">{t.free.materials}</p>
              </div>
              <footer className="flex flex-col gap-4 border-t border-border pt-6">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="price-figure">{t.free.price}</span>
                  <span className="text-body-sm text-text-muted">{t.free.how}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Button href={`${base}/courses/alphabet`} arrow>
                    {t.free.cta}
                  </Button>
                  <button type="button" className="course-link" onClick={() => choosePath("general")}>
                    {t.free.continue} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </footer>
            </article>
          ) : path === "general" ? (
            <article key="general" data-atmo-glass className="glass-panel course-info flex flex-col gap-6 rounded-(--radius-card) p-6 sm:p-9">
              <header key={general.code} className="course-swap flex flex-col gap-1.5">
                                <h3 className="display-headline text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight text-text">
                  {general.code} <span className="text-text-muted">{general.name}</span>
                </h3>
              </header>
              <div key={`d-${general.code}`} className="course-swap is-late">
                <DetailList
                  items={[
                    { label: t.forLabel, value: general.for },
                    { label: t.aboutLabel, value: general.about || t.pending, muted: !general.about },
                    { label: t.lessonsLabel, value: t.general.lessons },
                    { label: t.accessLabel, value: t.general.access },
                  ]}
                />
              </div>
              <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
                <div className="flex flex-col gap-1">
                  
                  <span key={general.price + general.code} className="course-swap price-figure">
                    {general.price}
                  </span>
                </div>
                <Button href={`${base}/courses/general-korean-${general.code.toLowerCase()}`} arrow>
                  {fill(t.general.cta, { code: general.code })}
                </Button>
              </footer>
            </article>
          ) : (
            <article key="topik" data-atmo-glass className="glass-panel course-info flex flex-col gap-6 rounded-(--radius-card) p-6 sm:p-9">
              <header key={topik.code} className="course-swap flex flex-col gap-1.5">
                                <h3 className="display-headline text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight text-text">
                  {t.topik.courseWord} {topik.code}
                </h3>
              </header>
              <div key={`d-${topik.code}`} className="course-swap is-late">
                <DetailList
                  items={[
                    { label: t.forLabel, value: t.topik.for },
                    { label: t.aboutLabel, value: t.pending, muted: true },
                    { label: t.lessonsLabel, value: t.topik.lessons },
                    { label: t.accessLabel, value: t.topik.access },
                  ]}
                />
              </div>
              <p className="text-caption text-text-muted">{t.topik.note}</p>
              <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
                <div className="flex flex-col gap-1">
                  
                  <span key={topik.price + topik.code} className="course-swap price-figure">
                    {topik.price}
                  </span>
                </div>
                <Button href={`${base}/courses/topik-${levels.topik + 1}`} arrow>
                  {fill(t.topik.cta, { code: topik.code })}
                </Button>
              </footer>
            </article>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
};
