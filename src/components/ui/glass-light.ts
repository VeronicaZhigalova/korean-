/*
  Pointer-led highlight for the hero liquid glass CTA, framework-free so the
  Home and its review preview run the same code. Writes --gx/--gy, which CSS
  eases (registered properties), and enables :active press states on iOS.
  Returns a stop function.
*/
export const startGlassLight = () => {
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
};
