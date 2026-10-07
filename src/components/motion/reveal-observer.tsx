"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/*
  Reveals [data-reveal] elements once as they enter the viewport (DESIGN.md §5).
  Hiding only starts after hydration, so content is always visible without
  JavaScript, and never hidden at all with reduced motion.
*/
export const RevealObserver = () => {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const targets = Array.from(document.body.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"));
    const viewport = window.innerHeight;

    // Anything already on screen is shown immediately, so nothing above the fold ever blinks.
    const pending = targets.filter((element) => {
      const { top } = element.getBoundingClientRect();
      if (top < viewport * 0.92) {
        element.classList.add("is-revealed");
        return false;
      }
      return true;
    });
    root.dataset.reveal = "on";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    pending.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
};
