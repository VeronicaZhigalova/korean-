import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { format } from "@/lib/cn";
import { Container } from "@/components/ui/layout";
import { BrandLockup } from "./brand-lockup";

const FooterLinks = ({ title, links }: { title: string; links: { href: string; label: string }[] }) => (
  <div className="flex flex-col gap-3">
    <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</h2>
    <ul className="flex flex-col gap-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="inline-flex min-h-10 items-center rounded-md text-body-sm text-text-muted transition-colors hover:text-text">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const currentYear = async () => {
  "use cache";
  return new Date().getFullYear();
};

export const SiteFooter = async () => {
  const [locale, t, year] = await Promise.all([getLocale(), getDictionary(), currentYear()]);
  const path = (segment: string) => `/${locale}/${segment}`;

  return (
    <footer aria-label={t.footer.label} className="mt-auto border-t border-border bg-bg-raised">
      <Container className="grid gap-10 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-4">
          <BrandLockup href={`/${locale}`} name={t.brand.name} tagline={t.brand.tagline} label={t.brand.homeLabel} compact />
        </div>
        <FooterLinks
          title={t.footer.explore}
          links={[
            { href: path("courses"), label: t.nav.courses },
            { href: path("quiz"), label: t.nav.quiz },
            { href: path("about"), label: t.nav.about },
            { href: path("contact"), label: t.footer.contact },
          ]}
        />
        <FooterLinks
          title={t.footer.legal}
          links={[
            { href: path("legal/imprint"), label: t.footer.imprint },
            { href: path("legal/privacy"), label: t.footer.privacy },
            { href: path("legal/terms"), label: t.footer.terms },
          ]}
        />
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-caption text-text-muted">{format(t.footer.copyright, { year })}</p>
      </Container>
    </footer>
  );
};
