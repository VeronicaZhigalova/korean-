import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "info" | "success" | "warning" | "error";

const toneText: Record<Tone, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

const toneBorder: Record<Tone, string> = {
  info: "border-info/55",
  success: "border-success/55",
  warning: "border-warning/55",
  error: "border-error/60",
};

type AlertProps = {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Announce dynamic errors to assistive technology. */
  live?: boolean;
};

/** Solid panel for real outcomes: never decorative, never animated (DESIGN.md §3). */
export const Alert = ({ tone, title, children, actions, live = false }: AlertProps) => (
  <div
    role={live ? (tone === "error" ? "alert" : "status") : undefined}
    className={cn("flex flex-col gap-2 rounded-(--radius-card) border bg-surface px-5 py-4", toneBorder[tone])}
  >
    <p className={cn("font-semibold", toneText[tone])}>{title}</p>
    {children ? <div className="text-body-sm text-text-muted">{children}</div> : null}
    {actions ? <div className="mt-1 flex flex-wrap gap-3">{actions}</div> : null}
  </div>
);

export const StatusPill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={cn(
      "inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border border-current/40 px-3 py-0.5 text-caption font-semibold",
      toneText[tone],
    )}
  >
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
    {children}
  </span>
);

type EmptyStateProps = {
  glyph?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
};

export const EmptyState = ({ glyph, title, children, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-(--radius-card) border border-dashed border-border px-6 py-10 text-center">
    {glyph ? (
      <span aria-hidden="true" lang="ko" className="text-5xl text-border-strong">
        {glyph}
      </span>
    ) : null}
    <p className="font-semibold text-text">{title}</p>
    {children ? <div className="max-w-prose text-body-sm text-text-muted">{children}</div> : null}
    {action}
  </div>
);
