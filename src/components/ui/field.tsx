import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

/** Persistent label, hint and error text wired to the control (DESIGN.md §7). */
export const Field = ({ id, label, hint, error, optionalLabel, children }: FieldProps) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-sm font-medium text-text">
        {label}
        {optionalLabel ? <span className="ml-1.5 font-normal text-text-muted">({optionalLabel})</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-body-sm text-error">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
};

const control =
  "w-full rounded-(--radius-control) border border-border-strong bg-bg px-4 py-3 text-body text-text " +
  "placeholder:text-text-muted transition-[border-color,box-shadow] duration-200 " +
  "focus:border-gold focus:shadow-[0_0_0_2px_var(--gold)] focus:outline-none " +
  "aria-invalid:border-error aria-invalid:shadow-[0_0_0_1px_var(--error)] " +
  "disabled:cursor-not-allowed disabled:opacity-55";

export const TextInput = ({ className, ...props }: ComponentProps<"input">) => (
  <input {...props} className={cn(control, "min-h-12", className)} />
);

export const TextArea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea {...props} className={cn(control, "min-h-32 resize-y", className)} />
);
