import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, StatusPill } from "@/components/ui/feedback";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Card, Container, SectionHeading } from "@/components/ui/layout";

// Internal reference page for reviewing tokens and component states. Not linked from the site.
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const colours = [
  ["bg", "Background / night"],
  ["bg-raised", "Background / raised"],
  ["surface", "Surface"],
  ["text", "Text / primary"],
  ["text-muted", "Text / secondary"],
  ["gold", "Brand / gold"],
  ["gold-light", "Brand / light gold"],
  ["border", "Border"],
  ["primary-bg", "Primary button"],
  ["success", "Success"],
  ["warning", "Warning"],
  ["error", "Error"],
] as const;

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-6 border-t border-border pt-10">
    <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</h2>
    {children}
  </section>
);

export default function DesignSystemPage() {
  return (
    <Container className="flex flex-col gap-14 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Phase 1 · internal"
        title={
          <>
            Design system <i className="text-accent">preview</i>
          </>
        }
        lede="Tokens and component states from DESIGN.md. Switch the theme in the header to check both modes."
      />

      <Block title="Colour tokens">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colours.map(([token, name]) => (
            <li key={token} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-12 shrink-0 rounded-xl border border-border"
                style={{ background: `var(--${token})` }}
              />
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-text">{name}</span>
                <code className="text-caption text-text-muted">--{token}</code>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Typography">
        <div className="flex flex-col gap-5">
          <p className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.98] tracking-[-0.02em]">
            Display · Instrument Serif
          </p>
          <p className="font-display text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.04]">
            Section heading <i className="text-accent">with an italic accent</i>
          </p>
          <p className="text-2xl font-semibold sm:text-[1.75rem]">Functional heading · Inter 600</p>
          <p className="text-body-lg text-text-muted">Body large · Inter 18/28 for ledes and lesson text.</p>
          <p>Body · Inter 16/26 for most interface copy.</p>
          <p className="text-caption text-text-muted">Caption · Inter 13/20 for metadata.</p>
          <p lang="ko" className="text-4xl font-semibold">
            한국어 · 말하고 싶은 것을 말하세요
          </p>
        </div>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
          <Button loading loadingLabel="Loading">
            Paying
          </Button>
        </div>
      </Block>

      <Block title="Form fields">
        <div className="grid max-w-2xl gap-6">
          <Field id="ds-name" label="Your name">
            {(describedBy, invalid) => (
              <TextInput id="ds-name" name="name" autoComplete="name" aria-describedby={describedBy} aria-invalid={invalid || undefined} />
            )}
          </Field>
          <Field id="ds-email" label="Email" hint="We only use this to reply to you.">
            {(describedBy, invalid) => (
              <TextInput id="ds-email" type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid || undefined} />
            )}
          </Field>
          <Field id="ds-answer" label="Your answer" error="Please enter an answer before you continue.">
            {(describedBy, invalid) => (
              <TextInput id="ds-answer" lang="ko" aria-describedby={describedBy} aria-invalid={invalid || undefined} defaultValue="" />
            )}
          </Field>
          <Field id="ds-message" label="Message" optionalLabel="optional">
            {(describedBy, invalid) => (
              <TextArea id="ds-message" aria-describedby={describedBy} aria-invalid={invalid || undefined} />
            )}
          </Field>
          <Field id="ds-disabled" label="Disabled field">
            {(describedBy) => <TextInput id="ds-disabled" disabled aria-describedby={describedBy} defaultValue="Not editable" />}
          </Field>
        </div>
      </Block>

      <Block title="Status and feedback">
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="success">Passed</StatusPill>
          <StatusPill tone="info">Suggested for study</StatusPill>
          <StatusPill tone="error">Not passed</StatusPill>
          <StatusPill tone="warning">Payment pending</StatusPill>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Alert tone="success" title="Payment received">
            Your course is now in your account.
          </Alert>
          <Alert tone="warning" title="Payment pending">
            SEPA payments can take a few working days. Access starts once the payment is confirmed.
          </Alert>
          <Alert tone="error" title="Payment failed" actions={<Button size="sm">Try again</Button>}>
            Nothing was charged. Your selection is still saved.
          </Alert>
          <Alert tone="info" title="Times are shown in Düsseldorf time">
            Europe/Berlin, including daylight saving changes.
          </Alert>
        </div>
      </Block>

      <Block title="Cards and empty state">
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <p className="font-display text-5xl leading-none">A1</p>
            <h3 className="text-body-lg font-semibold">General Korean A1</h3>
            <p className="text-body-sm text-text-muted">15 lessons · 40 minutes each · six months of access</p>
            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold tabular-nums">€39</span>
              <Button href="#" variant="secondary" size="sm">
                View course
              </Button>
            </div>
          </Card>
          <EmptyState glyph="책" title="No courses yet" action={<Button size="sm">Browse courses</Button>}>
            Courses you buy appear here with their access dates.
          </EmptyState>
        </div>
      </Block>
    </Container>
  );
}
