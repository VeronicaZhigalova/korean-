import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandLockupProps = {
  href: string;
  name: string;
  tagline: string;
  label: string;
  compact?: boolean;
};

/**
 * The client's wordmark and tagline as one lockup: the name in spaced capitals,
 * the tagline beneath in the serif italic, smaller and quieter, both on one left edge.
 */
export const BrandLockup = ({ href, name, tagline, label, compact = false }: BrandLockupProps) => (
  <Link href={href} aria-label={label} className="inline-flex w-fit flex-col gap-1 rounded-md py-1">
    <span
      className={cn(
        "font-semibold uppercase leading-none tracking-[0.18em] text-text",
        compact ? "text-[0.875rem]" : "text-[0.9375rem] sm:text-[1rem]",
      )}
    >
      {name}
    </span>
    <span
      className={cn(
        "font-display italic leading-none tracking-[0.01em] text-text-muted",
        compact ? "text-[0.8125rem]" : "text-[0.875rem] sm:text-[0.9375rem]",
      )}
    >
      {tagline}
    </span>
  </Link>
);
