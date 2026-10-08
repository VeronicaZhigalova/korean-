import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CourseShowcase } from "@/components/home/course-showcase";
import { StatusPill } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

type Home = Dictionary["home"];
type Href = (segment: string) => string;

const Eyebrow = ({ index, children }: { index: number; children: ReactNode }) => (
  <p className="flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent">
    <span className="tabular-nums text-text-muted">{String(index).padStart(2, "0")}</span>
    <span aria-hidden="true" className="h-px w-6 bg-gold" />
    {children}
  </p>
);

const SectionIntro = ({ id, index, eyebrow, title, lede }: { id: string; index: number; eyebrow: string; title: string; lede?: string }) => (
  <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
    <div className="flex flex-col gap-4 lg:col-span-7">
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <h2 id={id} className="display-headline section-headline text-text">
        {title}
      </h2>
    </div>
    {lede ? <p className="max-w-[46ch] text-body-lg text-text-muted lg:col-span-5 lg:pb-2">{lede}</p> : null}
  </div>
);

// Glass panels: the Hangul object shows softly through them (see .glass-panel).
const cardBase = "glass-panel flex h-full min-w-0 flex-col rounded-(--radius-card)";

/* 1 · Hero ------------------------------------------------------------ */

export const HeroSection = ({ t, href }: { t: Home; href: Href }) => (
  <section data-story="hero" aria-labelledby="home-title" className="overflow-hidden">
    {/* Centred so the Hangul universe can surround the copy on every side (8 Oct 2026). */}
    <Container className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center gap-7 py-20 text-center sm:py-24">
      <p className="flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent">
        <span aria-hidden="true" className="h-px w-6 bg-gold" />
        {t.eyebrow}
        <span aria-hidden="true" className="h-px w-6 bg-gold" />
      </p>
      <h1
        id="home-title"
        className="display-headline hero-headline text-balance text-text"
      >
        {t.titleBefore}
        <i className="text-accent">{t.titleAccent}</i>
        {t.titleAfter}
      </h1>
      <p className="max-w-[44ch] text-body-lg text-text-muted">{t.lede}</p>
      <div className="mt-3 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        <Button href={href("courses")} arrow prominent>
          {t.primaryCta}
        </Button>
        <Button href={href("quiz")} variant="secondary">
          {t.secondaryCta}
        </Button>
      </div>

      <a
        href="#paths-title"
        className="mt-10 inline-flex items-center gap-2 rounded-full px-3 py-2 sm:mt-14 text-caption font-semibold uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-accent focus-visible:text-accent"
      >
        {t.scrollCue}
        <span aria-hidden="true">↓</span>
      </a>
    </Container>
  </section>
);

/* 2 · Learning paths (with the free alphabet course) ----------------- */

export const LearningPathsSection = ({ t, href, base }: { t: Home["paths"]; href: Href; base: string }) => (
  <section data-story="paths" aria-labelledby="paths-title" className="py-24 lg:py-32">
    <Container className="flex flex-col gap-10 lg:gap-14">
      <SectionIntro id="paths-title" index={1} eyebrow={t.eyebrow} title={t.title} lede={t.lede} />
      <CourseShowcase t={t} base={base} />
      {/* Level quiz: optional help for choosing a course, set apart as its own quiet glass panel. */}
      <aside aria-labelledby="quiz-cta-title" data-atmo-glass className="glass-panel quiz-cta rounded-(--radius-card)">
        <div className="flex max-w-[40rem] flex-col gap-3">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-accent">{t.quiz.eyebrow}</p>
          <h3 id="quiz-cta-title" className="display-headline text-[clamp(1.6rem,2.6vw,2.15rem)] leading-tight text-text">
            {t.quiz.title}
          </h3>
          <p className="text-body text-text">{t.quiz.body}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2.5 sm:items-center">
          <Button href={href("quiz")} arrow>
            {t.quiz.cta}
          </Button>
          <p className="text-caption text-text-muted sm:text-center">{t.quiz.note}</p>
        </div>
      </aside>
    </Container>
  </section>
);

/* 3 · Coaching and Speaking Chat -------------------------------------- */

export const ServicesSection = ({ t, href }: { t: Home["services"]; href: Href }) => (
  <section data-story="services" aria-labelledby="services-title" className="py-24 lg:py-32">
    <Container className="flex flex-col gap-12 lg:gap-16">
      <SectionIntro id="services-title" index={2} eyebrow={t.eyebrow} title={t.title} lede={t.lede} />

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <article data-atmo-glass className={cn(cardBase, "relative gap-6 overflow-hidden p-6 sm:p-8")}>
                        <header className="flex flex-col items-start gap-3">
              <StatusPill tone="warning">{t.coaching.requirement}</StatusPill>
              <h3 className="display-headline text-[1.75rem] leading-tight text-text">{t.coaching.title}</h3>
              <p className="text-body-sm text-text-muted">{t.coaching.body}</p>
            </header>
            <dl className="flex flex-col border-t border-border pt-3">
              {t.coaching.options.map((option) => (
                <div key={option.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-body text-text">{option.label}</dt>
                  <dd className="price-figure">{option.price}</dd>
                </div>
              ))}
            </dl>
            <Button href={href("coaching")} variant="secondary" arrow className="mt-auto self-start">
              {t.coaching.cta}
            </Button>
          </article>
        </div>

        <div>
          <article data-atmo-glass className={cn(cardBase, "relative gap-6 overflow-hidden p-6 sm:p-8")}>
                        <header className="flex flex-col items-start gap-3">
              <StatusPill tone="success">{t.chat.requirement}</StatusPill>
              <h3 className="display-headline text-[1.75rem] leading-tight text-text">{t.chat.title}</h3>
              <p className="text-body-sm text-text-muted">{t.chat.body}</p>
            </header>
            <dl className="flex flex-col border-t border-border pt-3">
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-body text-text">{t.chat.duration}</dt>
                <dd className="price-figure">{t.chat.price}</dd>
              </div>
            </dl>
            <Button href={href("speaking-chat")} variant="secondary" arrow className="mt-auto self-start">
              {t.chat.cta}
            </Button>
          </article>
        </div>
      </div>
    </Container>
  </section>
);

/* 4 · Meet the teacher ------------------------------------------------- */

// Every slot is ready for approved content; nothing about the teacher is invented.
export const TeacherSection = ({ t, href }: { t: Home["teacher"]; href: Href }) => (
  <section data-story="teacher" aria-labelledby="teacher-title" className="overflow-hidden py-24 lg:py-32">
    <Container className="grid items-center gap-10 md:grid-cols-12 lg:gap-14">
      <figure className="md:col-span-5">
        <div
          data-atmo-glass
          className="glass-panel relative grid aspect-[4/5] w-full max-w-[26rem] place-items-center overflow-hidden rounded-(--radius-card)"
        >
          <span aria-hidden="true" lang="ko" className="glyph-soft font-korean text-[clamp(7rem,14vw,10rem)] font-extrabold leading-none opacity-70">
            말
          </span>
          <figcaption className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-bg/60 px-4 py-3 text-center text-caption text-text-muted">
            {t.photo}
          </figcaption>
        </div>
        <p lang="ko" aria-hidden="true" className="mt-3 max-w-[26rem] text-center text-caption tracking-[0.14em] text-text-muted">
          {t.glyphCaption}
        </p>
      </figure>

      <div className="flex flex-col items-start gap-6 md:col-span-7 lg:col-span-6 lg:col-start-7">
        <Eyebrow index={3}>{t.eyebrow}</Eyebrow>
        <h2 id="teacher-title" className="display-headline section-headline text-text">
          {t.title}
        </h2>
        <StatusPill tone="warning">{t.status}</StatusPill>
        <dl className="flex w-full flex-col border-t border-border">
          {[
            [t.nameLabel, t.name],
            [t.bioLabel, t.bio],
            [t.qualificationsLabel, t.qualifications],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-6">
              <dt className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</dt>
              <dd className="text-body-sm text-text-muted">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-body-sm text-text-muted">{t.contact}</p>
        <Button href={href("about")} variant="secondary" arrow>
          {t.cta}
        </Button>
      </div>
    </Container>
  </section>
);
