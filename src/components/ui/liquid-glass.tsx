"use client";

import { useEffect } from "react";

/*
  Liquid glass support (styles in globals.css, .lg).

  GlassFilter holds the SVG lens that refracts what sits behind the hero CTA.
  Only Chromium renders SVG filters inside backdrop-filter, so
  glassRefractScript (head-scripts.ts) marks <html data-refract> there and
  every other browser keeps the blur-based glass. GlassLight lets the hero
  CTA's highlight follow the pointer (eased in CSS) and enables :active
  press states on iOS.
*/

// Lens map: neutral grey at the rim, brighter at the centre, stretched to the pill.
const lensMap =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56">' +
      '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="rgb(196,196,196)"/><stop offset="100%" stop-color="rgb(128,128,128)"/>' +
      '</radialGradient></defs><rect width="200" height="56" rx="28" fill="url(#g)"/></svg>',
  );

export const GlassFilter = () => (
  <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
    <filter id="lg-refract" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feImage href={lensMap} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale="18" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const GlassLight = () => {
  useEffect(() => {
    // iOS only applies :active when the page listens for touches.
    const onTouch = () => {};
    document.addEventListener("touchstart", onTouch, { passive: true });
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return () => document.removeEventListener("touchstart", onTouch);
    }

    const onMove = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(".lg-prominent");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      button.style.setProperty("--gx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      button.style.setProperty("--gy", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    };
    const onLeave = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(".lg-prominent");
      if (!button || button.contains(event.relatedTarget as Node | null)) return;
      button.style.removeProperty("--gx");
      button.style.removeProperty("--gy");
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouch);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return null;
};
