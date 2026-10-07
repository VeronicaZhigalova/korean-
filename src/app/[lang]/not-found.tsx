import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <Container className="flex flex-1 flex-col items-start justify-center gap-5 py-24">
      <span aria-hidden="true" lang="ko" className="text-6xl text-border-strong">
        길
      </span>
      <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight text-text">{t.notFound.title}</h1>
      <p className="max-w-[48ch] text-body-lg text-text-muted">{t.notFound.body}</p>
      <Button href={`/${locale}`}>{t.notFound.cta}</Button>
    </Container>
  );
}
