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
        className="header-control inline-grid size-11 place-items-center"
      >
        {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!isOpen}
        className="header-panel absolute inset-x-0 top-full px-4 pb-6 pt-2 sm:px-8"
      >
        <nav aria-label={navLabel}>
          <ul className="flex flex-col">
            {items.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "nav-link relative flex min-h-12 w-fit items-center !text-[1.0625rem]",
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
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-5">{utilities}</div>
      </div>
    </div>
  );
};
