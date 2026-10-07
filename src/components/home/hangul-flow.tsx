"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startHangulFlow, type FlowOptions } from "./flow-engine";

/*
  The Home's Hangul current (motion lives in flow-engine.ts). Wraps the
  sections so one layer can run behind all of them: section tones paint
  below it, content and glass panels above it. Decorative and aria-hidden;
  the engine builds its contents after hydration.
*/

type Props = FlowOptions & { children: ReactNode };

export const HangulFlow = ({ routes, seed, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    return startHangulFlow(layer, root, { routes, seed });
  }, [routes, seed]);

  return (
    <div className="relative isolate">
      {children}
      <div
        ref={ref}
        className="hangul-flow"
        // Options travel with the markup so the static review preview can start the same engine.
        data-hangul-flow={JSON.stringify({ routes, seed })}
        aria-hidden="true"
      />
    </div>
  );
};
