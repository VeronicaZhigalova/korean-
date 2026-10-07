"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { glyphFontSize, positionAt, seedParticles, startHangulField, type FieldZone } from "./hangul-engine";

/*
  A living field of Hangul (motion lives in hangul-engine.ts). The server
  renders a composed still frame; the engine takes it over after hydration.
  Decorative and aria-hidden.
*/

export type { FieldZone };

type Props = {
  count: number;
  /** Fewer characters below 1024 px and below 640 px. */
  countTablet?: number;
  countMobile?: number;
  zones: FieldZone[];
  /** Size range in rem, from far to near. */
  size?: [number, number];
  /** Deterministic seed so the server and first client render agree. */
  seed: number;
  /** Section fields are quieter versions of the hero. */
  quiet?: boolean;
  /** Peak opacity of the most prominent characters (hero default 0.58). */
  presence?: number;
};

export const HangulField = ({ count, countTablet, countMobile, zones, size = [1.2, 5.5], seed, quiet = false, presence = 0.58 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = seedParticles({ count, countTablet, countMobile, zones, size, seed, quiet, presence });

  useEffect(() => {
    if (!ref.current) return;
    return startHangulField(ref.current, { count, countTablet, countMobile, zones, size, seed, quiet, presence });
  }, [count, countTablet, countMobile, zones, size, seed, quiet, presence]);

  return (
    <div
      ref={ref}
      className={quiet ? "hangul-field hangul-field-quiet" : "hangul-field"}
      // Options travel with the markup so the static review preview can start the same engine.
      data-field={JSON.stringify({ count, countTablet, countMobile, zones, size, seed, quiet, presence })}
      aria-hidden="true"
    >
      <div data-light className="hf-light" />
      {seeded.map((p, index) => {
        const start = positionAt(p, 0);
        return (
          <span
            key={index}
            data-glyph
            lang="ko"
            className={
              index >= (countMobile ?? countTablet ?? count)
                ? index >= (countTablet ?? count)
                  ? "hf-glyph hf-desktop-only"
                  : "hf-glyph hf-no-phone"
                : "hf-glyph"
            }
            style={
              {
                // Rounded so the browser's normalised style matches the server attribute.
                left: `${+start.x.toFixed(3)}%`,
                top: `${+start.y.toFixed(3)}%`,
                fontSize: glyphFontSize(p.depth, size),
                opacity: +p.peak.toFixed(3),
                "--d": p.depth.toFixed(2),
              } as CSSProperties
            }
          >
            {/* Glyphs render through ::before so the decoration carries no text content. */}
            <span className="hf-ink" data-g={p.glyph} />
            <span className="hf-glow" data-g={p.glyph} />
          </span>
        );
      })}
    </div>
  );
};
