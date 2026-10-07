"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startHangulAtmosphere, type AtmosphereVariant } from "./hangul-atmosphere";

/*
  The site's Hangul night sky (motion lives in hangul-atmosphere.ts). Wraps a
  page's content so one layer runs behind all of it: section tones paint
  below it, content and glass panels above it. `variant` sets the page's
  intensity; an element inside marked data-atmosphere="hero" (or another
  variant) overrides it while it fills the middle of the viewport.
  Decorative and aria-hidden; the engine builds its contents after hydration.
*/

type Props = { variant?: AtmosphereVariant; seed?: number; children: ReactNode };

export const GlobalHangulAtmosphere = ({ variant = "medium", seed = 11, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    return startHangulAtmosphere(layer, root, { variant, seed });
  }, [variant, seed]);

  return (
    <div className="relative isolate">
      {children}
      <div
        ref={ref}
        className="hangul-atmosphere"
        // Options travel with the markup so the static review preview can start the same engine.
        data-hangul-atmosphere={JSON.stringify({ variant, seed })}
        aria-hidden="true"
      />
    </div>
  );
};
