"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "./mobile-menu";

export const DesktopNav = ({ items, label }: { items: NavItem[]; label: string }) => {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-8">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "nav-link relative inline-flex min-h-11 items-center rounded-sm",
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
  );
};
