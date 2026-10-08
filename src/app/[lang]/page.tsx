import {
  AlphabetSection,
  HeroSection,
  LearningPathsSection,
  ServicesSection,
  TeacherSection,
} from "@/components/home/home-sections";
import { homeStory } from "@/components/home/home-story";
import { HangulStory } from "@/components/motion/hangul-story-layer";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Section order follows Figma frame 01 and CLAUDE.md: Hero → learning paths →
// free alphabet → teacher-led services → teacher.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const href = (segment: string) => `/${locale}/${segment}`;

  // One Hangul object blooms in the hero and travels to the teacher as the page scrolls.
  return (
    <HangulStory stops={homeStory.stops} seed={homeStory.seed}>
      <HeroSection t={t.home} href={href} />
      <LearningPathsSection t={t.home.paths} href={href} />
      <AlphabetSection t={t.home.alphabet} href={href} />
      <ServicesSection t={t.home.services} href={href} />
      <TeacherSection t={t.home.teacher} href={href} />
    </HangulStory>
  );
}
