# SAID IN KOREAN

Website and learning platform for SAID IN KOREAN, a Korean-language school ("say what matters to you").

## Stack

- Next.js (App Router, Cache Components) with TypeScript
- Tailwind CSS v4, with design tokens in `src/app/globals.css`
- Supabase for auth, database and storage, and Stripe for payments. Both are planned and not connected yet.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000 redirects to /en or /de
npm run build
npm run lint
```

## Structure

| Path | Purpose |
|---|---|
| `src/app/[lang]/` | Every route lives under the locale segment (`en`, `de`) |
| `src/proxy.ts` | Redirects locale-less URLs using the saved choice or `Accept-Language` |
| `src/i18n/` | Locale config and EN/DE dictionaries. German copy is a draft pending client approval. |
| `src/components/ui/` | Base components: Button, Field, Alert, StatusPill, EmptyState, Card, Container, SectionHeading |
| `src/components/layout/` | Site header, mobile menu, language switch, theme toggle, footer |
| `/[lang]/design-system` | Internal (noindex) preview of tokens and component states |

## Design rules

The visual system follows DESIGN.md: dark navy and gold by default, with a usable light mode. Inter is used for the interface and Instrument Serif for display headings. Product scope and page structure follow the approved Figma file and the Notion project.

Marketing pages may move. Learning, account, quiz, checkout and booking pages stay calm. Every effect must respect `prefers-reduced-motion`.
