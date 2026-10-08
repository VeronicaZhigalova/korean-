import {
  AlphabetSection,
  HeroSection,
  LearningPathsSection,
  ServicesSection,
  TeacherSection,
} from "@/components/home/home-sections";
import { homeUniverse } from "@/components/home/home-universe";
import { HangulUniverse } from "@/components/motion/hangul-universe-layer";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Section order follows Figma frame 01 and CLAUDE.md: Hero → learning paths →
// free alphabet → teacher-led services → teacher.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const href = (segment: string) => `/${locale}/${segment}`;

  // Hangul characters fill the space around the hero and settle at the bottom of each section.
  return (
    <HangulUniverse scenes={homeUniverse.scenes}>
      <HeroSection t={t.home} href={href} />
      <LearningPathsSection t={t.home.paths} href={href} />
      <AlphabetSection t={t.home.alphabet} href={href} />
      <ServicesSection t={t.home.services} href={href} />
      <TeacherSection t={t.home.teacher} href={href} />
    </HangulUniverse>
  );
}
