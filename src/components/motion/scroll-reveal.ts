/*
  Section entrances for Home (Hangul Journey, 9 Oct 2026). Framework-free so the
  Home and its review preview run the same code.

  Elements marked data-reveal="<kind>" that start below the fold are set to
  "pending" and play their entrance once when they come into view; the CSS for
  each kind lives in globals.css (heading, unit, card). Anything already on
  screen, any element without JavaScript, and everything under reduced motion
  stays as it is: content is never hidden waiting for an animation.
  Only transform, opacity and clip-path are animated; one IntersectionObserver
  serves the whole page, so scrolling does no work of its own.
*/

export const startScrollReveal = (root: HTMLElement) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return () => {};

  const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
    (el) => el.getBoundingClientRect().top > innerHeight * 0.92,
  );
  // A pending heading is clipped away, which would also hide it from the observer: watch its container instead.
  const watched = new Map<Element, HTMLElement[]>();
  for (const el of targets) {
    const watch = el.dataset.reveal === "heading" ? (el.parentElement ?? el) : el;
    watched.set(watch, [...(watched.get(watch) ?? []), el]);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const el of watched.get(entry.target) ?? []) el.dataset.revealState = "in";
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
  );
  for (const el of targets) el.dataset.revealState = "pending";
  for (const watch of watched.keys()) observer.observe(watch);
  return () => {
    observer.disconnect();
    for (const el of targets) delete el.dataset.revealState;
  };
};
