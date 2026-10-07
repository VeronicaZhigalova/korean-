"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  Adds the two behaviours CSS can't: a gentle pointer tilt (fine pointers only,
  never with reduced motion) and pausing all drift while the hero is off screen.
*/
export const HangulNetworkMotion = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;

    const visibility = new IntersectionObserver(([entry]) => {
      stage.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    visibility.observe(stage);

    const allowTilt =
      matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!allowTilt) return () => visibility.disconnect();

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        stage.style.setProperty("--px", x.toFixed(3));
        stage.style.setProperty("--py", y.toFixed(3));
      });
    };
    const onLeave = () => {
      stage.style.setProperty("--px", "0");
      stage.style.setProperty("--py", "0");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      visibility.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="hn-stage">
      {children}
    </div>
  );
};
