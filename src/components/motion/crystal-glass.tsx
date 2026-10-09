import type { CSSProperties } from "react";

/*
  Crystal Blue Glass (9 Oct 2026): the one material for every sculptural
  letter on Home (hero Hangul, course levels, the alphabet's 한글).

  Drawn by an SVG filter from the letter's own outline, so Korean glyphs keep
  their exact shapes:
  - the outline is softened and re-cut a little wider, which rounds every
    corner and gives thin strokes a thicker, inflated body;
  - a blurred copy becomes a height map, so strokes read as thick, domed glass;
  - the body is a clear ice-blue tint, deeper towards the edges where light
    travels further through the glass;
  - a cool key light from the upper left gives the polished bevel, light
    caught inside rises from the lower edge, a small champagne glint answers
    from the right, and a fine rim keeps the edge crisp;
  - a soft contact shadow sits under the piece.
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
    <filter id={`crystal-${size}`} x="-12%" y="-12%" width="124%" height="140%" colorInterpolationFilters="sRGB">
      {/* Inflated, rounded outline: thin serifs and corners swell into soft glass. */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={n(2.6)} result="soft" />
      <feComponentTransfer in="soft" result="round">
        <feFuncA type="linear" slope="5" intercept="-0.55" />
      </feComponentTransfer>
      {/* Height map and the thin outer band. */}
      <feGaussianBlur in="round" stdDeviation={n(5)} result="height" />
      <feMorphology in="round" operator="erode" radius={n(1.1)} result="inner" />
      <feComposite in="round" in2="inner" operator="out" result="band" />
      <feComposite in="round" in2="height" operator="arithmetic" k1="-1" k2="1" k3="0" k4="0" result="thick" />
      {/* Contact shadow. */}
      <feGaussianBlur in="round" stdDeviation={n(7)} result="shadowSoft" />
      <feOffset in="shadowSoft" dy={n(9)} result="shadowDrop" />
      <feFlood style={token("--crystal-shadow")} />
      <feComposite in2="shadowDrop" operator="in" result="shadow" />
      {/* Clear body, deeper at the edges. */}
      <feFlood style={token("--crystal-body")} />
      <feComposite in2="round" operator="in" result="body" />
      <feFlood style={token("--crystal-edge")} />
      <feComposite in2="thick" operator="in" result="edge" />
      {/* Internal depth: a dark refraction line runs inside each stroke, parallel to its lit edge, as in thick glass. */}
      <feOffset in="height" dx={n(2.5)} dy={n(3.5)} result="heightShift" />
      <feComposite in="heightShift" in2="height" operator="arithmetic" k1="0" k2="3" k3="-3" k4="0" result="fold" />
      <feComposite in="fold" in2="round" operator="in" result="foldIn" />
      <feFlood style={token("--crystal-depth")} />
      <feComposite in2="foldIn" operator="in" result="depth" />
      {/* Light caught inside the glass, rising from the lower edge. */}
      <feSpecularLighting in="height" surfaceScale={n(5)} specularConstant="0.6" specularExponent="14" style={light("--crystal-inner")} result="innerLight">
        <feDistantLight azimuth="90" elevation="24" />
      </feSpecularLighting>
      <feComposite in="innerLight" in2="round" operator="in" result="caught" />
      {/* Polished key light from the upper left. */}
      <feSpecularLighting in="height" surfaceScale={n(6)} specularConstant="1" specularExponent="44" style={light("--crystal-key")} result="keyLight">
        <feDistantLight azimuth="225" elevation="46" />
      </feSpecularLighting>
      <feComposite in="keyLight" in2="round" operator="in" result="key" />
      {/* Small champagne glint from the right. */}
      <feSpecularLighting in="height" surfaceScale={n(6)} specularConstant="0.7" specularExponent="46" style={light("--crystal-glint")} result="glintLight">
        <feDistantLight azimuth="345" elevation="20" />
      </feSpecularLighting>
      <feComposite in="glintLight" in2="round" operator="in" result="glint" />
      {/* Crisp rim. */}
      <feFlood style={token("--crystal-rim")} />
      <feComposite in2="band" operator="in" result="rim" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="body" />
        <feMergeNode in="edge" />
        <feMergeNode in="depth" />
        <feMergeNode in="caught" />
        <feMergeNode in="rim" />
        <feMergeNode in="glint" />
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
