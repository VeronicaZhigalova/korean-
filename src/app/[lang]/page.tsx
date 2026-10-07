import {
  AlphabetSection,
  HeroSection,
  LearningPathsSection,
  ServicesSection,
  TeacherSection,
} from "@/components/home/home-sections";
import { homeStory } from "@/components/home/home-story";
import { CardLight } from "@/components/motion/card-light";
import { HangulStory } from "@/components/motion/hangul-story-layer";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Section order follows Figma frame 01 and CLAUDE.md: Hero → learning paths →
// free alphabet → teacher-led services → teacher.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const href = (segment: string) => `/${locale}/${segment}`;

  return (
    <>
      {/* One Hangul object travels from the hero to the teacher as the page scrolls. */}
      <HangulStory stops={homeStory.stops} seed={homeStory.seed}>
        <HeroSection t={t.home} href={href} />
        <LearningPathsSection t={t.home.paths} href={href} />
        <AlphabetSection t={t.home.alphabet} href={href} />
        <ServicesSection t={t.home.services} href={href} />
        <TeacherSection t={t.home.teacher} href={href} />
      </HangulStory>
      <RevealObserver />
      <CardLight />
    </>
  );
}
