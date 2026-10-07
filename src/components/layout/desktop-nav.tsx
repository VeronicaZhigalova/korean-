"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "./mobile-menu";

export const DesktopNav = ({ items, label }: { items: NavItem[]; label: string }) => {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-7">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-md text-body-sm font-medium transition-colors",
                  "after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-300",
                  current
                    ? "text-text after:scale-x-100"
                    : "text-text-muted after:scale-x-0 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
