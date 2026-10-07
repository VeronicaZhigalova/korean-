"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startHangulStory, type StoryOptions } from "./hangul-story";

/*
  One Hangul object that travels down the page with the scroll (motion lives
  in hangul-story.ts). Wraps the page's sections so the object can pass
  behind all of them: section tones paint below it, content and glass panels
  above it. Decorative and aria-hidden; the engine builds it after hydration.
*/

type Props = StoryOptions & { children: ReactNode };

export const HangulStory = ({ stops, seed, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    return startHangulStory(layer, root, { stops, seed });
  }, [stops, seed]);

  return (
    <div className="relative isolate">
      {children}
      <div
        ref={ref}
        className="hangul-story"
        // Options travel with the markup so the static review preview can start the same engine.
        data-hangul-story={JSON.stringify({ stops, seed })}
        aria-hidden="true"
      />
    </div>
  );
};
