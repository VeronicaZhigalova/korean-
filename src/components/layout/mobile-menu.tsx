"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string };

type MobileMenuProps = {
  items: NavItem[];
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  utilities: ReactNode;
};

export const MobileMenu = ({ items, navLabel, openLabel, closeLabel, utilities }: MobileMenuProps) => {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close after navigating, without an effect: the panel only counts as open on the page it was opened from.
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const toggle = () => {
    setOpen(!isOpen);
    setOpenedAt(pathname);
  };

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? closeLabel : openLabel}
        onClick={toggle}
        className="inline-grid size-11 place-items-center rounded-full border border-border text-text transition-colors hover:border-border-strong"
      >
        {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full border-b border-border bg-bg-raised px-4 pb-6 pt-2 sm:px-8"
      >
        <nav aria-label={navLabel}>
          <ul className="flex flex-col">
            {items.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="border-b border-border last:border-b-0">
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center text-body-lg font-medium",
                      current ? "text-text" : "text-text-muted hover:text-text",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-5 flex flex-wrap items-center gap-3">{utilities}</div>
      </div>
    </div>
  );
};
