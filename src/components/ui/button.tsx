import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  /** Trailing arrow that nudges forward on hover (DESIGN.md §5). */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps & Omit<ComponentProps<"button">, keyof CommonProps> & { href?: never };
type ButtonAsLink = CommonProps & Omit<ComponentProps<typeof Link>, keyof CommonProps> & { href: string };

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
  secondary:
    "bg-transparent text-text shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--text)]",
  ghost: "bg-transparent text-text-muted hover:text-text",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-7 text-body-sm",
  sm: "min-h-11 px-5 text-body-sm",
};

const base =
  "group/btn inline-flex items-center justify-center gap-2.5 rounded-full font-semibold text-center " +
  "transition-[background-color,box-shadow,color,scale] duration-200 ease-(--ease-out-soft) " +
  "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-45";

const Spinner = () => (
  <span
    aria-hidden="true"
    className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
  />
);

export const Button = (props: ButtonAsButton | ButtonAsLink) => {
  const { variant = "primary", size = "md", loading = false, loadingLabel, icon, arrow = false, className, children, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], loading && "pointer-events-none", className);
  const content = (
    <>
      {loading ? <Spinner /> : icon}
      <span>{children}</span>
      {arrow && !loading ? (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-300 ease-(--ease-out-soft) group-hover/btn:translate-x-[3px]"
        />
      ) : null}
      {loading && loadingLabel ? <span className="sr-only">{loadingLabel}</span> : null}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link {...(rest as Omit<ButtonAsLink, keyof CommonProps>)} className={classes}>
        {content}
      </Link>
    );
  }

  const { type = "button", disabled, ...buttonProps } = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
};
