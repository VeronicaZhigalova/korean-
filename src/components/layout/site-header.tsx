import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { BrandLockup } from "./brand-lockup";
import { DesktopNav } from "./desktop-nav";
import { LanguageSwitch } from "./language-switch";
import { MobileMenu, type NavItem } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

export const SiteHeader = async () => {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const path = (segment: string) => `/${locale}/${segment}`;

  const items: NavItem[] = [
    { href: path("courses"), label: t.nav.courses },
    { href: path("quiz"), label: t.nav.quiz },
    { href: path("coaching"), label: t.nav.coaching },
    { href: path("speaking-chat"), label: t.nav.speakingChat },
    { href: path("about"), label: t.nav.about },
  ];

  const utilities = (
    <>
      <LanguageSwitch current={locale} label={t.language.label} switchToTemplate={t.language.switchTo} />
      <ThemeToggle toDarkLabel={t.theme.toDark} toLightLabel={t.theme.toLight} />
      <Link
        href={path("account")}
        className="header-control inline-flex min-h-11 items-center px-4 text-[0.875rem] font-medium tracking-[0.01em]"
      >
        {t.nav.account}
      </Link>
    </>
  );

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="relative mx-auto flex min-h-[5rem] w-full max-w-(--container-content) items-center justify-between gap-6 px-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-12">
          <BrandLockup
            href={`/${locale}`}
            name={t.brand.name}
            tagline={t.brand.tagline}
            label={t.brand.homeLabel}
          />
          <DesktopNav items={items} label={t.nav.label} />
        </div>
        <div className="hidden items-center gap-3 lg:flex">{utilities}</div>
        <MobileMenu
          items={items}
          navLabel={t.nav.label}
          openLabel={t.nav.openMenu}
          closeLabel={t.nav.closeMenu}
          utilities={utilities}
        />
      </div>
    </header>
  );
};
