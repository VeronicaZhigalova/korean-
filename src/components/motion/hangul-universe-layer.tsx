"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startHangulUniverse, type UniverseOptions } from "./hangul-universe";

/*
  The glass Hangul around a page's hero (placement and motion live in
  hangul-universe.ts). Wraps the sections so the characters sit between the
  background and the content. Decorative and aria-hidden; the engine builds
  it after hydration.
*/

type Props = { options: UniverseOptions; children: ReactNode; className?: string };

export const HangulUniverse = ({ options, children, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    return startHangulUniverse(layer, root, options);
  }, [options]);

  return (
    <div className={className ? `relative isolate ${className}` : "relative isolate"}>
      {children}
      <div
        ref={ref}
        className="hangul-universe"
        // Options travel with the markup so the static review preview can start the same engine.
        data-hangul-universe={JSON.stringify(options)}
        aria-hidden="true"
      />
    </div>
  );
};
