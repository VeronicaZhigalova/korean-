"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  Springs the hero object toward the pointer. An underdamped spring gives the
  elastic overshoot and the soft settle when the pointer stops; the loop only
  runs while something is still moving. Fine pointers only, never with reduced
  motion; phones keep the CSS-only autonomous sway.
*/

const STIFFNESS = 90;
const DAMPING = 11;

type Spring = { value: number; velocity: number; target: number };

const spring = (): Spring => ({ value: 0, velocity: 0, target: 0 });

const step = (s: Spring, dt: number) => {
  const force = STIFFNESS * (s.target - s.value) - DAMPING * s.velocity;
  s.velocity += force * dt;
  s.value += s.velocity * dt;
  return Math.abs(s.target - s.value) > 0.001 || Math.abs(s.velocity) > 0.001;
};

export const HangulObjectMotion = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;

    const visibility = new IntersectionObserver(([entry]) => {
      stage.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    visibility.observe(stage);

    const interactive =
      matchMedia("(pointer: fine) and (min-width: 640px)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!interactive) return () => visibility.disconnect();

    stage.dataset.interactive = "true";
    const maxTilt = matchMedia("(min-width: 1024px)").matches ? 16 : 9;
    const tiltX = spring();
    const tiltY = spring();
    let frame = 0;
    let last = 0;

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const moving = [step(tiltX, dt), step(tiltY, dt)].some(Boolean);
      stage.style.setProperty("--tx", tiltX.value.toFixed(4));
      stage.style.setProperty("--ty", tiltY.value.toFixed(4));
      frame = moving ? requestAnimationFrame(render) : 0;
    };

    const kick = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      // Normalised to the object's own centre, softly clamped so far-away pointers still read.
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.75);
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.75);
      tiltX.target = Math.max(-1, Math.min(1, nx));
      tiltY.target = Math.max(-1, Math.min(1, ny));
      kick();
    };
    const onLeave = () => {
      tiltX.target = 0;
      tiltY.target = 0;
      kick();
    };

    stage.style.setProperty("--max-tilt", `${maxTilt}deg`);
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
    <div ref={ref} className="ho-stage">
      {children}
    </div>
  );
};
