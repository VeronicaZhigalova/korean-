import type { CSSProperties } from "react";

/*
  Crystal Blue Glass (9 Oct 2026): the one material for every sculptural
  letter on Home (hero Hangul, course levels, the alphabet's 한글).

  Drawn by an SVG filter from the letter's own outline, so Korean glyphs keep
  their exact shapes:
  - the outline is softened and re-cut sharply, which rounds corners while
    keeping a crisp silhouette;
  - a blurred copy becomes a height map, so strokes read as thick, domed glass;
  - the body is almost clear, so the background reads through it; colour
    gathers only where the glass is thick;
  - one key light from the upper left: faces turned to it catch a fine bright
    edge and a crisp highlight, faces turned away refract deep blue, and the
    light that passes through lands behind the piece as a faint caustic;
  - a tight contact shadow ties the piece to its surroundings.
  Colours come from --crystal-* tokens, so dark and light themes share it.
  Three sizes keep the bevel in proportion from small to very large letters.
  Rasterised once per element: animate the transform of a wrapper, never the
  filtered element itself.
*/

export type CrystalSize = "s" | "m" | "l";

/** Size class for a letter of `px` height. */
export const crystalSize = (px: number): CrystalSize => (px < 70 ? "s" : px < 150 ? "m" : "l");

const SCALE: Record<CrystalSize, number> = { s: 0.45, m: 0.85, l: 1.45 };

const token = (name: string): CSSProperties => ({ floodColor: `var(${name})` });
const light = (name: string): CSSProperties => ({ lightingColor: `var(${name})` });

const CrystalFilter = ({ size }: { size: CrystalSize }) => {
  const k = SCALE[size];
  const n = (value: number) => +(value * k).toFixed(2);
  return (
    <filter id={`crystal-${size}`} x="-20%" y="-15%" width="150%" height="160%" colorInterpolationFilters="sRGB">
      {/* Rounded outline: corners soften, the silhouette stays sharp. */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={n(1.1)} result="soft" />
      <feComponentTransfer in="soft" result="round">
        <feFuncA type="linear" slope="14" intercept="-4.2" />
      </feComponentTransfer>
      <feGaussianBlur in="round" stdDeviation={n(3)} result="height" />
      <feComposite in="round" in2="height" operator="arithmetic" k1="-1" k2="1" k3="0" k4="0" result="thick" />
      {/* Light passes through the glass and lands behind it, down and to the right of the light. */}
      <feGaussianBlur in="round" stdDeviation={n(7)} result="castSoft" />
      <feOffset in="castSoft" dx={n(9)} dy={n(16)} result="castDrop" />
      <feFlood style={token("--crystal-caustic")} />
      <feComposite in2="castDrop" operator="in" result="caustic" />
      {/* A tight contact shadow keeps the piece from floating free of its world. */}
      <feGaussianBlur in="round" stdDeviation={n(2.2)} result="shadowSoft" />
      <feOffset in="shadowSoft" dx={n(2)} dy={n(4)} result="shadowDrop" />
      <feFlood style={token("--crystal-shadow")} />
      <feComposite in2="shadowDrop" operator="in" result="shadowAll" />
      <feComposite in="shadowAll" in2="round" operator="out" result="shadow" />
      {/* Clear body: barely tinted, so the background reads through; colour gathers only where the glass is thick. */}
      <feFlood style={token("--crystal-body")} />
      <feComposite in2="round" operator="in" result="body" />
      <feFlood style={token("--crystal-edge")} />
      <feComposite in2="thick" operator="in" result="edge" />
      {/* Directional edges: faces turned to the light (upper left) catch a fine bright line,
          faces turned away refract deep blue. No uniform outline. */}
      <feOffset in="round" dx={n(1.6)} dy={n(1.6)} result="towardShade" />
      <feComposite in="round" in2="towardShade" operator="out" result="litFace" />
      <feGaussianBlur in="litFace" stdDeviation={n(0.35)} result="litSoft" />
      <feFlood style={token("--crystal-rim")} />
      <feComposite in2="litSoft" operator="in" result="rim" />
      <feOffset in="round" dx={n(-2.4)} dy={n(-2.4)} result="towardLight" />
      <feComposite in="round" in2="towardLight" operator="out" result="shadeFace" />
      <feGaussianBlur in="shadeFace" stdDeviation={n(0.8)} result="shadeSoft" />
      <feFlood style={token("--crystal-depth")} />
      <feComposite in2="shadeSoft" operator="in" result="depth" />
      {/* Transmitted light: a soft glow inside the lower edge, where light exits the glass. */}
      <feSpecularLighting in="height" surfaceScale={n(5)} specularConstant="0.8" specularExponent="14" style={light("--crystal-inner")} result="innerLight">
        <feDistantLight azimuth="60" elevation="22" />
      </feSpecularLighting>
      <feComposite in="innerLight" in2="round" operator="in" result="caught" />
      {/* One key light from the upper left: a crisp highlight on the crown of each stroke. */}
      <feSpecularLighting in="height" surfaceScale={n(7)} specularConstant="2.1" specularExponent="60" style={light("--crystal-key")} result="keyLight">
        <feDistantLight azimuth="225" elevation="50" />
      </feSpecularLighting>
      <feComposite in="keyLight" in2="round" operator="in" result="key" />
      <feMerge>
        <feMergeNode in="caustic" />
        <feMergeNode in="shadow" />
        <feMergeNode in="body" />
        <feMergeNode in="edge" />
        <feMergeNode in="depth" />
        <feMergeNode in="caught" />
        <feMergeNode in="rim" />
        <feMergeNode in="key" />
      </feMerge>
    </filter>
  );
};

/** The filter definitions; render once on a page that uses the material. */
export const CrystalGlassDefs = () => (
  <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
    <CrystalFilter size="s" />
    <CrystalFilter size="m" />
    <CrystalFilter size="l" />
  </svg>
);

/** A letter or short word in Crystal Blue Glass. Decorative: give the meaning to its container. */
export const CrystalGlyph = ({ text, size, className }: { text: string; size: CrystalSize; className?: string }) => (
  <span aria-hidden="true" lang="ko" className={className ? `crystal ${className}` : "crystal"} data-crystal={size}>
    {text}
  </span>
);
