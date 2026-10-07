import {
  AlphabetSection,
  HeroSection,
  LearningPathsSection,
  ServicesSection,
  TeacherSection,
} from "@/components/home/home-sections";
import { homeFlow } from "@/components/home/home-flow";
import { HangulFlow } from "@/components/home/hangul-flow";
import { CardLight } from "@/components/motion/card-light";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Section order follows Figma frame 01 and CLAUDE.md: Hero → learning paths →
// free alphabet → teacher-led services → teacher.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const href = (segment: string) => `/${locale}/${segment}`;

  return (
    <>
      {/* One Hangul current runs behind all five sections. */}
      <HangulFlow routes={homeFlow.routes} seed={homeFlow.seed}>
        <HeroSection t={t.home} href={href} />
        <LearningPathsSection t={t.home.paths} href={href} />
        <AlphabetSection t={t.home.alphabet} href={href} />
        <ServicesSection t={t.home.services} href={href} />
        <TeacherSection t={t.home.teacher} href={href} />
      </HangulFlow>
      <RevealObserver />
      <CardLight />
    </>
  );
}
