"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeCookie, localeNames, locales, type Locale } from "@/i18n/config";
import { cn, format } from "@/lib/cn";

type LanguageSwitchProps = {
  current: Locale;
  label: string;
  switchToTemplate: string;
};

const withLocale = (pathname: string, locale: Locale) => {
  const [, , ...rest] = pathname.split("/");
  return `/${[locale, ...rest].filter(Boolean).join("/")}`;
};

const remember = (locale: Locale) => {
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
};

export const LanguageSwitch = ({ current, label, switchToTemplate }: LanguageSwitchProps) => {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center text-[0.8125rem]">
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden="true" className="px-0.5 text-border-strong">
              /
            </span>
          ) : null}
          <Link
            href={withLocale(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? "true" : undefined}
            aria-label={locale === current ? undefined : format(switchToTemplate, { language: localeNames[locale] })}
            onClick={() => remember(locale)}
            className={cn(
              "inline-grid min-h-11 min-w-9 place-items-center rounded-sm font-medium uppercase tracking-[0.08em] transition-colors duration-150",
              locale === current ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {locale}
          </Link>
        </span>
      ))}
    </nav>
  );
};
