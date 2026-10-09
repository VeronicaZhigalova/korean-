"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import { CrystalGlyph } from "@/components/motion/crystal-glass";
import { cn } from "@/lib/cn";

type Paths = Dictionary["home"]["paths"];
type PathKey = "free" | "general" | "topik";

const PATHS: PathKey[] = ["free", "general", "topik"];

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/*
  Course showcase (9 Oct 2026). One level at a time: only the selected level
  stands on the stage, as a Crystal Blue Glass sculpture, and every level stays
  available in the controls below. Changing level, the current piece recedes
  and dissolves while the new one rises into the centre; pieces still leaving
  are kept until they have faded, so rapid changes never overlap or flicker.
  The selected piece floats a few pixels with a slow rhythm, its shadow
  widening and softening as it rises (CSS, still under reduced motion).
  A horizontal swipe on the stage steps to the neighbouring level; page
  scrolling is never taken over.
*/

/** How long a piece takes to recede; matches .course-object.is-leaving in globals.css. */
const LEAVE_MS = 420;

type StageProps = {
  items: { key: string; label: string; kicker?: string }[];
  selected: number;
  /** Counts every selection, including choosing the level already shown, so each one gets its bounce. */
  pulse: number;
  onSelect: (index: number) => void;
};

/** The selected level as a glass sculpture: a decorative view of the choice the controls below make. */
const LevelStage = ({ items, selected, pulse, onSelect }: StageProps) => {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const [leaving, setLeaving] = useState<{ index: number; id: number }[]>([]);
  const current = useRef(selected);
  const counter = useRef(0);

  // Keep the piece that was on stage while it recedes; each leaving piece clears itself.
  useEffect(() => {
    const previous = current.current;
    if (previous === selected) return;
    current.current = selected;
    const id = ++counter.current;
    setLeaving((list) => [...list.filter((item) => item.index !== selected && item.index !== previous), { index: previous, id }]);
    window.setTimeout(() => setLeaving((list) => list.filter((item) => item.id !== id)), LEAVE_MS + 40);
  }, [selected]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, horizontal: null };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    // Decide once whether this gesture is a horizontal swipe; vertical ones stay page scrolls.
    if (state.horizontal === null && Math.hypot(dx, dy) > 8) {
      state.horizontal = Math.abs(dx) > Math.abs(dy);
      if (state.horizontal) stage.current?.setPointerCapture(event.pointerId);
    }
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const dx = event.clientX - state.x;
    if (state.horizontal && Math.abs(dx) > 48) {
      const next = Math.max(0, Math.min(items.length - 1, selected + (dx < 0 ? 1 : -1)));
      if (next !== selected) onSelect(next);
    }
  };

  const piece = (index: number, state: "current" | "leaving", key: string) => {
    const item = items[index];
    return (
      <div key={key} className={cn("course-object", state === "leaving" ? "is-leaving" : "is-current")}>
        {/* Remounting the bounce layers restarts their animation on every selection. */}
        <span key={`s-${pulse}`} className="course-shadow" />
        <div key={`b-${pulse}`} className="course-bounce">
          <div className="course-float">
            {item.kicker ? <span className="course-object-kicker">{item.kicker}</span> : null}
            <CrystalGlyph text={item.label} size="l" className="course-object-glass" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={stage}
      aria-hidden="true"
      className="course-stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <span className="course-stage-light" />
      {leaving.map((item) => piece(item.index, "leaving", `leave-${item.id}`))}
      {piece(selected, "current", `level-${items[selected].key}`)}
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
      {/* ㅎ ㅏ ㄴ glide into one block and become 한, then 글 joins: 한글 in the same glass as the levels. */}
      <span aria-hidden="true" className="jamo jamo-h"><CrystalGlyph text="ㅎ" size="m" /></span>
      <span aria-hidden="true" className="jamo jamo-a"><CrystalGlyph text="ㅏ" size="m" /></span>
      <span aria-hidden="true" className="jamo jamo-n"><CrystalGlyph text="ㄴ" size="m" /></span>
      <span aria-hidden="true" className="jamo-word">
        <span className="course-shadow" />
        <span className="course-float">
          <span className="jamo-syllable"><CrystalGlyph text="한" size="l" /></span>
          <span className="jamo-syllable is-late"><CrystalGlyph text="글" size="l" /></span>
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
  const [pulse, setPulse] = useState(0);
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
    setPulse((count) => count + 1);
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
                selected={levels.general}
                pulse={pulse}
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
                selected={levels.topik}
                pulse={pulse}
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
              <footer className="mt-1 flex flex-col gap-4">
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
              <footer className="mt-2 flex flex-wrap items-center justify-between gap-4">
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
              <footer className="mt-2 flex flex-wrap items-center justify-between gap-4">
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
