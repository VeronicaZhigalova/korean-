"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startHangulUniverse, type UniverseOptions } from "./hangul-universe";

/*
  The Hangul universe behind a page's sections (placement and motion live in
  hangul-universe.ts). Wraps the sections so the characters sit between the
  section tones and the content. Decorative and aria-hidden; the engine builds
  it after hydration.
*/

type Props = UniverseOptions & { children: ReactNode };

export const HangulUniverse = ({ scenes, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    return startHangulUniverse(layer, root, { scenes });
  }, [scenes]);

  return (
    <div className="relative isolate">
      {children}
      <div
        ref={ref}
        className="hangul-universe"
        // Options travel with the markup so the static review preview can start the same engine.
        data-hangul-universe={JSON.stringify({ scenes })}
        aria-hidden="true"
      />
    </div>
  );
};
