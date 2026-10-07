import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

type Home = Dictionary["home"];
type Href = (segment: string) => string;

const delay = (index: number, step = 90): CSSProperties => ({ "--reveal-delay": `${index * step}ms` }) as CSSProperties;
const enter = (index: number): CSSProperties => ({ "--enter-delay": `${120 + index * 110}ms` }) as CSSProperties;

const Eyebrow = ({ index, children }: { index: number; children: ReactNode }) => (
  <p className="flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent">
    <span className="tabular-nums text-text-muted">{String(index).padStart(2, "0")}</span>
    <span aria-hidden="true" className="h-px w-6 bg-gold" />
    {children}
  </p>
);

const SectionIntro = ({ id, index, eyebrow, title, lede }: { id: string; index: number; eyebrow: string; title: string; lede?: string }) => (
  <div data-reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
    <div className="flex flex-col gap-4 lg:col-span-7">
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <h2 id={id} className="font-display text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.015em] text-text">
        {title}
      </h2>
    </div>
    {lede ? <p className="max-w-[46ch] text-body-lg text-text-muted lg:col-span-5 lg:pb-2">{lede}</p> : null}
  </div>
);

// Glass panels: the Hangul sky shows softly through them (see .glass-panel).
const cardBase = "card-lit glass-panel flex h-full min-w-0 flex-col rounded-(--radius-card)";

/* 1 · Hero ------------------------------------------------------------ */

export const HeroSection = ({ t, href }: { t: Home; href: Href }) => (
  <section data-atmosphere="hero" aria-labelledby="home-title" className="surface-night overflow-hidden">

    <Container className="grid gap-12 pb-14 pt-14 sm:min-h-[calc(100svh-4.5rem)] sm:content-center sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-8">
      <div className="flex flex-col items-start gap-6 sm:max-w-[36rem] lg:col-span-7 lg:max-w-none">
        <p className="enter-up flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent" style={enter(0)}>
          <span aria-hidden="true" className="h-px w-6 bg-gold" />
          {t.eyebrow}
        </p>
        <h1
          id="home-title"
          className="enter-up font-display text-[clamp(2.85rem,6.6vw,5.25rem)] leading-[0.98] tracking-[-0.02em] text-text"
          style={enter(1)}
        >
          {t.titleBefore}
          <i className="text-accent">{t.titleAccent}</i>
          {t.titleAfter}
        </h1>
        <p className="enter-up max-w-[44ch] text-body-lg text-text-muted" style={enter(2)}>
          {t.lede}
        </p>
        <div className="enter-up mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={enter(3)}>
          <Button href={href("courses")} arrow prominent>
            {t.primaryCta}
          </Button>
          <Button href={href("quiz")} variant="secondary">
            {t.secondaryCta}
          </Button>
        </div>

        {/* Below lg the Hangul sky opens here, under the buttons (GlobalHangulAtmosphere). */}
        <div className="mt-2 h-[19rem] w-full sm:h-[30rem] lg:hidden" aria-hidden="true" />

        {/* Quiet facts row: stays in the text column so nothing covers the network. */}
        <dl
          aria-label={t.factsLabel}
          className="enter-up mt-4 grid w-full grid-cols-3 border-t border-border/70 pt-5 sm:mt-8 sm:max-w-[34rem]"
          style={enter(4)}
        >
          {t.facts.map((fact, index) => (
            <div key={fact.label} className={cn("flex flex-col gap-1.5 pr-3", index > 0 && "border-l border-border/70 pl-4 sm:pl-6")}>
              <dt className="order-2 text-caption leading-snug text-text-muted">{fact.label}</dt>
              <dd
                lang={fact.value === "한글" ? "ko" : undefined}
                className={cn(
                  "order-1 text-[1.5rem] leading-none text-accent sm:text-[1.75rem]",
                  fact.value === "한글" ? "font-korean font-semibold" : "font-sans font-semibold tracking-[-0.01em] tabular-nums",
                )}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Container>
  </section>
);

/* 2 · Learning paths --------------------------------------------------- */

const generalLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const topikLevels = ["I", "II", "III", "IV", "V", "VI"];

const LevelStair = ({ label }: { label: string }) => (
  <div className="flex flex-col gap-3">
    <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
    <ol className="grid grid-cols-6 items-end gap-1.5 [--stair-base:3.25rem] [--stair-step:0.85rem] sm:gap-2.5 sm:[--stair-base:4rem] sm:[--stair-step:1.1rem] lg:[--stair-base:5rem] lg:[--stair-step:1.55rem]">
      {generalLevels.map((level, index) => (
        <li
          key={level}
          className="flex flex-col justify-end rounded-xl border border-border bg-bg/40 px-1.5 pb-3 pt-3 text-center sm:px-2"
          style={{ height: `calc(var(--stair-base) + ${index} * var(--stair-step))` }}
        >
          <span
            className={cn(
              "font-sans text-[clamp(1.05rem,1.9vw,1.6rem)] font-semibold leading-none tracking-[-0.01em] tabular-nums",
              index >= 4 ? "text-accent" : "text-text",
            )}
          >
            {level}
          </span>
        </li>
      ))}
    </ol>
  </div>
);

export const LearningPathsSection = ({ t, href }: { t: Home["paths"]; href: Href }) => (
  <section aria-labelledby="paths-title" className="surface-raised py-24 lg:py-32">
    <Container className="flex flex-col gap-12 lg:gap-16">
      <SectionIntro id="paths-title" index={1} eyebrow={t.eyebrow} title={t.title} lede={t.lede} />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        <div data-reveal style={delay(0)} className="md:col-span-2 lg:col-span-7 lg:row-span-2">
          <article data-atmo-glass className={cn(cardBase, "glass-lead gap-8 p-6 sm:p-9")}>
            <header className="flex flex-col gap-2">
              <h3 className="font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-tight text-text">{t.general.title}</h3>
              <p className="text-body-sm text-text-muted">{t.general.meta}</p>
            </header>
            <LevelStair label={t.general.levelsLabel} />
            <footer className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-border pt-6">
              <div className="flex flex-col gap-1">
                <span className="font-display text-4xl leading-none tabular-nums text-text">{t.general.price}</span>
                <span className="text-caption text-text-muted">{t.general.access}</span>
              </div>
              <Button href={`${href("courses")}#general-korean`} arrow>
                {t.general.cta}
              </Button>
            </footer>
          </article>
        </div>

        <div data-reveal style={delay(1)} className="lg:col-span-5">
          <article data-atmo-glass className={cn(cardBase, "gap-5 p-6 sm:p-7")}>
            <header className="flex items-start justify-between gap-4">
              <h3 className="font-display text-[1.875rem] leading-tight text-text">{t.topik.title}</h3>
              <span className="pt-2 text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{t.topik.levelsLabel}</span>
            </header>
            <ol className="flex flex-wrap gap-1.5" aria-label={t.topik.levelsLabel}>
              {topikLevels.map((level) => (
                <li key={level} className="grid h-9 min-w-10 place-items-center rounded-lg border border-border px-2 font-display text-lg leading-none text-text">
                  {level}
                </li>
              ))}
            </ol>
            <p className="text-body-sm text-text-muted">{t.topik.meta}</p>
            <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <span className="font-display text-[1.75rem] leading-none tabular-nums text-text">{t.topik.price}</span>
              <Button href={`${href("courses")}#topik`} variant="secondary" size="sm" arrow>
                {t.topik.cta}
              </Button>
            </footer>
          </article>
        </div>

        <div data-reveal style={delay(2)} className="lg:col-span-5">
          <article className="card-lit flex h-full flex-col gap-4 rounded-(--radius-card) border border-dashed border-border-strong p-6 transition-colors duration-300 hover:border-gold sm:p-7">
            <span className="w-fit rounded-full border border-border px-3 py-0.5 text-caption font-semibold text-text-muted">{t.quiz.meta}</span>
            <h3 className="text-xl font-semibold text-text">{t.quiz.title}</h3>
            <p className="text-body-sm text-text-muted">{t.quiz.body}</p>
            <Button href={href("quiz")} variant="secondary" size="sm" arrow className="mt-auto self-start">
              {t.quiz.cta}
            </Button>
          </article>
        </div>
      </div>
    </Container>
  </section>
);

/* 3 · Free alphabet ---------------------------------------------------- */

const AlphabetVisual = ({ caption }: { caption: string }) => {
  const jamo = ["ㅎ", "ㅏ", "ㄴ"];
  return (
    <figure
     
      data-atmo-glass
      className="glass-panel relative flex flex-col items-center gap-6 rounded-(--radius-card) px-6 py-10 sm:py-14"
      aria-label={caption}
    >
      <div className="flex items-center gap-3 sm:gap-5" aria-hidden="true">
        {jamo.map((letter, index) => (
          <span key={letter} data-reveal style={delay(index, 120)} className="flex items-center gap-3 sm:gap-5">
            <span lang="ko" className="grid size-16 place-items-center rounded-2xl border border-border-strong font-korean text-3xl font-semibold text-text sm:size-20 sm:text-4xl">
              {letter}
            </span>
            {index < jamo.length - 1 ? <span className="text-xl text-text-muted">+</span> : null}
          </span>
        ))}
      </div>
      <svg aria-hidden="true" viewBox="0 0 240 40" className="h-8 w-48 text-gold" fill="none">
        <path d="M20 4 C 60 36, 180 36, 220 4" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
        <path d="M120 30 v8" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span data-reveal style={delay(3, 120)} lang="ko" aria-hidden="true" className="font-korean text-[clamp(6rem,14vw,9.5rem)] font-extrabold leading-none text-accent">
        한
      </span>
      <figcaption lang="ko" className="text-caption tracking-[0.14em] text-text-muted">
        {caption}
      </figcaption>
    </figure>
  );
};

export const AlphabetSection = ({ t, href }: { t: Home["alphabet"]; href: Href }) => (
  <section aria-labelledby="alphabet-title" className="surface-night overflow-hidden py-24 lg:py-32">
    <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="order-2 lg:order-1 lg:col-span-5">
        <AlphabetVisual caption={t.visualCaption} />
      </div>
      <div data-reveal className="order-1 flex flex-col items-start gap-6 lg:order-2 lg:col-span-6 lg:col-start-7">
        <Eyebrow index={2}>{t.eyebrow}</Eyebrow>
        <h2 id="alphabet-title" className="font-display text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.015em] text-text">
          {t.title}
        </h2>
        <StatusPill tone="success">{t.badge}</StatusPill>
        <p className="max-w-[48ch] text-body-lg text-text-muted">{t.body}</p>
        <div className="flex w-full flex-col gap-3">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{t.stepsLabel}</p>
          <ol className="flex flex-col border-t border-border">
            {t.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-5 border-b border-border py-3.5">
                <span className="w-6 font-display text-xl tabular-nums text-accent">{index + 1}</span>
                <span className="text-body text-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <Button href={href("courses/alphabet")} variant="secondary" arrow className="mt-2">
          {t.cta}
        </Button>
      </div>
    </Container>
  </section>
);

/* 4 · Coaching and Speaking Chat -------------------------------------- */

export const ServicesSection = ({ t, href }: { t: Home["services"]; href: Href }) => (
  <section aria-labelledby="services-title" className="surface-raised py-24 lg:py-32">
    <Container className="flex flex-col gap-12 lg:gap-16">
      <SectionIntro id="services-title" index={3} eyebrow={t.eyebrow} title={t.title} lede={t.lede} />

      <div className="grid gap-5 md:grid-cols-2">
        <div data-reveal style={delay(0)}>
          <article data-atmo-glass className={cn(cardBase, "relative gap-6 overflow-hidden p-6 sm:p-8")}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <header className="flex flex-col items-start gap-3">
              <StatusPill tone="warning">{t.coaching.requirement}</StatusPill>
              <h3 className="font-display text-[2.25rem] leading-tight text-text">{t.coaching.title}</h3>
              <p className="text-body-sm text-text-muted">{t.coaching.body}</p>
            </header>
            <dl className="flex flex-col border-t border-border">
              {t.coaching.options.map((option) => (
                <div key={option.label} className="flex items-baseline justify-between gap-4 border-b border-border py-4">
                  <dt className="text-body text-text">{option.label}</dt>
                  <dd className="font-display text-3xl leading-none tabular-nums text-text">{option.price}</dd>
                </div>
              ))}
            </dl>
            <Button href={href("coaching")} arrow className="mt-auto self-start">
              {t.coaching.cta}
            </Button>
          </article>
        </div>

        <div data-reveal style={delay(1)}>
          <article data-atmo-glass className={cn(cardBase, "relative gap-6 overflow-hidden p-6 sm:p-8")}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-info to-transparent" />
            <header className="flex flex-col items-start gap-3">
              <StatusPill tone="success">{t.chat.requirement}</StatusPill>
              <h3 className="font-display text-[2.25rem] leading-tight text-text">{t.chat.title}</h3>
              <p className="text-body-sm text-text-muted">{t.chat.body}</p>
            </header>
            <dl className="flex flex-col border-t border-border">
              <div className="flex items-baseline justify-between gap-4 border-b border-border py-4">
                <dt className="text-body text-text">{t.chat.duration}</dt>
                <dd className="font-display text-3xl leading-none tabular-nums text-text">{t.chat.price}</dd>
              </div>
            </dl>
            <Button href={href("speaking-chat")} arrow className="mt-auto self-start">
              {t.chat.cta}
            </Button>
          </article>
        </div>
      </div>
    </Container>
  </section>
);

/* 5 · Meet the teacher ------------------------------------------------- */

export const TeacherSection = ({ t, href }: { t: Home["teacher"]; href: Href }) => (
  <section aria-labelledby="teacher-title" className="surface-night overflow-hidden py-24 lg:py-36">
    <Container className="grid items-center gap-12 lg:grid-cols-12">
      <div data-reveal className="flex flex-col items-start gap-6 lg:col-span-6">
        <Eyebrow index={4}>{t.eyebrow}</Eyebrow>
        <h2 id="teacher-title" className="font-display text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.015em] text-text">
          {t.title}
        </h2>
        <p className="max-w-[44ch] text-body-lg text-text-muted">{t.body}</p>
        <Button href={href("about")} variant="secondary" arrow className="mt-2">
          {t.cta}
        </Button>
      </div>
      <figure data-reveal style={delay(1)} className="flex flex-col items-center gap-4 lg:col-span-5 lg:col-start-8" aria-hidden="true">
        <span data-atmo-quiet lang="ko" className="glyph-soft font-korean text-[clamp(10rem,24vw,18rem)] font-extrabold leading-none">
          말
        </span>
        <figcaption lang="ko" className="text-caption tracking-[0.14em] text-text-muted">
          {t.glyphCaption}
        </figcaption>
      </figure>
    </Container>
  </section>
);
