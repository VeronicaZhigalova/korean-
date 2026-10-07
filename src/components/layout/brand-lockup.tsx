import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandLockupProps = {
  href: string;
  name: string;
  tagline: string;
  label: string;
  compact?: boolean;
};

/** The school name always reads louder than the serif tagline (CLAUDE.md, DESIGN.md §2). */
export const BrandLockup = ({ href, name, tagline, label, compact = false }: BrandLockupProps) => (
  <Link href={href} aria-label={label} className="inline-flex w-fit flex-col items-center rounded-md">
    <span
      className={cn(
        "font-bold uppercase leading-none tracking-[0.14em] text-text",
        compact ? "text-[0.9375rem]" : "text-[1.0625rem] sm:text-[1.1875rem]",
      )}
    >
      {name}
    </span>
    <span
      className={cn(
        "-mt-px font-display italic leading-tight text-text-muted",
        compact ? "text-[0.8125rem]" : "text-[0.875rem]",
      )}
    >
      {tagline}
    </span>
  </Link>
);
