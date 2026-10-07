import type { CSSProperties } from "react";
import { HangulObjectMotion } from "./hangul-object-motion";

/*
  Hero object: Hangul with real spatial presence. A dimensional 말 ("words,
  speech") sits at the centre of a small 3D scene; 한 and 글 and loose jamo float
  at their own depths around it, inside two tilted orbit rings (a separate 3D context behind the glyphs). Depth comes from
  translateZ inside one perspective, so pointer tilt gives true parallax: near
  glyphs travel further than far ones. Decorative and aria-hidden.
*/

type Glyph = {
  glyph: string;
  /** Position in the square stage, in %. */
  x: number;
  y: number;
  /** Size in % of the stage width. */
  size: number;
  /** Depth in px; positive comes toward the viewer. */
  z: number;
  tone: "warm" | "cool" | "muted";
  /** Idle float timing, so every glyph breathes on its own rhythm. */
  float: number;
  delay: number;
  /** Kept on phones, where the composition is simpler. */
  compact?: boolean;
};

const satellites: Glyph[] = [
  { glyph: "한", x: 30, y: 17, size: 13, z: -90, tone: "cool", float: 9, delay: -2, compact: true },
  { glyph: "글", x: 80, y: 72, size: 11, z: 130, tone: "warm", float: 7.5, delay: -4, compact: true },
  { glyph: "ㅎ", x: 82, y: 21, size: 6, z: 190, tone: "muted", float: 6.5, delay: -1 },
  { glyph: "ㅏ", x: 24, y: 80, size: 7, z: 160, tone: "muted", float: 8, delay: -5, compact: true },
  { glyph: "ㄴ", x: 58, y: 90, size: 5, z: -50, tone: "muted", float: 10, delay: -3 },
];

/** Back layers of the 말 extrusion, nearest first. */
const extrusion = [1, 2, 3, 4, 5, 6, 7, 8];

const place = (g: Glyph): CSSProperties =>
  ({
    left: `${g.x}%`,
    top: `${g.y}%`,
    "--z": `${g.z}px`,
    "--size": `${g.size}cqw`,
    "--float": `${g.float}s`,
    "--float-delay": `${g.delay}s`,
  }) as CSSProperties;

export const HangulObject = () => (
  <div className="hangul-object" aria-hidden="true">
    <HangulObjectMotion>
      <div className="ho-light" />
      {/* Rings live in their own 3D context so they never slice through the glyphs. */}
      <div className="ho-rings">
        <div className="ho-idle">
          <div className="ho-scene">
            <span className="ho-orbit ho-orbit-a" />
            <span className="ho-orbit ho-orbit-b" />
          </div>
        </div>
      </div>
      <div className="ho-idle">
        <div className="ho-scene">

          {satellites.map((g) => (
            <span key={g.glyph} className={`ho-glyph ho-${g.tone}${g.compact ? "" : " ho-detail"}`} style={place(g)}>
              <span lang="ko" className="ho-float">
                {g.glyph}
              </span>
            </span>
          ))}

          <span className="ho-glyph ho-focal" style={{ left: "50%", top: "50%", "--z": "40px" } as CSSProperties}>
            <span className="ho-float">
              {extrusion.map((layer) => (
                <span key={layer} lang="ko" className="ho-depth" style={{ "--layer": layer } as CSSProperties}>
                  말
                </span>
              ))}
              <span lang="ko" className="ho-face">
                말
              </span>
            </span>
          </span>
        </div>
      </div>
    </HangulObjectMotion>
  </div>
);
