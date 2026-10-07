import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Container = ({ className, ...props }: ComponentProps<"div">) => (
  <div {...props} className={cn("mx-auto w-full max-w-(--container-content) px-4 sm:px-8 lg:px-12", className)} />
);

export const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "flex min-w-0 flex-col gap-4 rounded-(--radius-card) border border-border bg-surface p-6 sm:p-7",
      className,
    )}
  />
);

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  as?: ElementType;
  /** "display" for marketing surfaces, "functional" for learning and account surfaces. */
  register?: "display" | "functional";
};

export const SectionHeading = ({ eyebrow, title, lede, as: Heading = "h2", register = "display" }: SectionHeadingProps) => (
  <div className="flex max-w-3xl flex-col gap-3.5">
    {eyebrow ? (
      <p className="flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.2em] text-accent">
        <span aria-hidden="true" className="h-px w-6 bg-gold" />
        {eyebrow}
      </p>
    ) : null}
    <Heading
      className={
        register === "display"
          ? "font-display text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.04] tracking-[-0.01em] text-text"
          : "text-2xl font-semibold leading-tight text-text sm:text-[1.75rem]"
      }
    >
      {title}
    </Heading>
    {lede ? <div className="max-w-[62ch] text-body-lg text-text-muted">{lede}</div> : null}
  </div>
);
