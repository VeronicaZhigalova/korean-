import {
  HeroSection,
  LearningPathsSection,
  ServicesSection,
  TeacherSection,
} from "@/components/home/home-sections";
import { homeUniverse } from "@/components/home/home-universe";
import { HangulUniverse } from "@/components/motion/hangul-universe-layer";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

// Hero → learning paths (the free alphabet course is the first path, 8 Oct 2026) →
// teacher-led services → teacher.
export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const href = (segment: string) => `/${locale}/${segment}`;

  // One continuous background (.home-canvas) runs behind every section.
  // Hangul characters fill the space around the hero and settle at the bottom of each section.
  return (
    <HangulUniverse scenes={homeUniverse.scenes} className="home-canvas">
      <HeroSection t={t.home} />
      <LearningPathsSection t={t.home.paths} href={href} base={`/${locale}`} />
      <ServicesSection t={t.home.services} href={href} />
      <TeacherSection t={t.home.teacher} href={href} />
    </HangulUniverse>
  );
}
