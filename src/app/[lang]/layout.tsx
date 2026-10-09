import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Instrument_Serif, Noto_Serif_KR } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { glassRefractScript, themeInitScript } from "@/components/layout/head-scripts";
import { GlassFilter, GlassLight } from "@/components/ui/liquid-glass";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Cinzel (SIL Open Font License) for the hero and section headlines: one variable
// file, preloaded because the hero headline is the first thing on the page.
const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  variable: "--font-cinzel",
  display: "swap",
});

// Korean glyphs load by unicode range only when a page uses them.
const notoSerifKr = Noto_Serif_KR({
  weight: ["600", "800"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getDictionary();
  return {
    title: { default: t.meta.title, template: `%s · ${t.brand.name}` },
    description: t.meta.description,
    alternates: { languages: Object.fromEntries(locales.map((locale) => [locale, `/${locale}`])) },
  };
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060b16" },
    { media: "(prefers-color-scheme: light)", color: "#f8f7f3" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html
      lang={locale}
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${notoSerifKr.variable} ${cinzel.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + glassRefractScript }} />
      </head>
      <body className="flex min-h-svh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-primary px-5 py-3 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t.nav.skipToContent}
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <SiteFooter />
        <GlassFilter />
        <GlassLight />
      </body>
    </html>
  );
}
