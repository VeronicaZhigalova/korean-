import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Phase 1 shell: only the Home hero copy from Figma frame 01. The remaining
// sections (learning paths, free alphabet, services, teacher) arrive in Phase 2.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <Container className="flex min-h-[calc(100svh-4.5rem)] flex-col justify-center gap-7 py-20">
      <p className="flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent">
        <span aria-hidden="true" className="h-px w-6 bg-gold" />
        {t.home.eyebrow}
      </p>
      <h1 className="max-w-[14ch] font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.98] tracking-[-0.02em] text-text">
        {t.home.title}
      </h1>
      <p className="max-w-[46ch] text-body-lg text-text-muted">{t.home.lede}</p>
      <div className="flex flex-wrap gap-3">
        <Button href={`/${locale}/courses`}>{t.home.primaryCta}</Button>
        <Button href={`/${locale}/quiz`} variant="secondary">
          {t.home.secondaryCta}
        </Button>
      </div>
    </Container>
  );
}
