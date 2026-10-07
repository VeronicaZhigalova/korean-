#!/usr/bin/env node
/*
  Builds the Home Motion Preview: one self-contained HTML page that shows the
  real Home (server-rendered HTML and compiled CSS from a running build) in a
  resizable frame with Desktop / Tablet / Mobile, Dark / Light and Full /
  Reduced motion controls, for review as a Claude artifact.

  The motion code is not rewritten for the preview: hangul-story.ts and
  glass-light.ts are transpiled from src and run against the same markup.
  Only small shims replace React for the theme toggle, mobile menu and
  section reveal.

  Usage:
    npm run build && npx next start -p 3200
    node scripts/build-motion-preview.mjs http://localhost:3200 out/home-motion-preview.html
*/
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const [base = "http://localhost:3200", out = "out/home-motion-preview.html"] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
};

/* Framework-free motion modules, transpiled as plain scripts. */
const transpile = (file) =>
  ts
    .transpileModule(readFileSync(join(root, file), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020, removeComments: false },
    })
    .outputText.replace(/^export \{\};?$/gm, "")
    .replace(/^export /gm, "");

const page = await fetchText(`${base}/en`);

/* CSS: inline the compiled stylesheets; fonts come from Google Fonts. */
const cssLinks = [...page.matchAll(/<link rel="stylesheet" href="([^"]+\.css)"/g)].map((m) => m[1]);
let css = (await Promise.all(cssLinks.map((href) => fetchText(base + href)))).join("\n");
css = css.replace(/@font-face\s*\{[^}]*\/media\/[^}]*\}/g, "");
const reducedCss = css
  .replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g, "@media all")
  .replace(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/g, "@media not all");

/* Body: server HTML without Next's runtime scripts. */
let body = page.slice(page.indexOf("<body"), page.lastIndexOf("</body>") + 7);
body = body.replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<link[^>]*>/g, "");
const htmlAttrs = page.match(/<html([^>]*)>/)[1].replace(/data-theme="[^"]*"/, 'data-theme="dark"');

const fonts =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Noto+Serif+KR:wght@600;800&display=swap">';

const shims = String.raw`
var RM = !!window.__RM, root = document.documentElement;
try { var t = parent.__theme; if (t) root.dataset.theme = t; } catch (e) {}
window.addEventListener('message', function (e) { if (e.data && e.data.theme) { root.dataset.theme = e.data.theme; syncToggle(); } });

/* Reduced motion: the preview frame answers the media query the way the OS would. */
if (RM) { var mm = window.matchMedia.bind(window); window.matchMedia = function (q) { if (q.indexOf('prefers-reduced-motion') > -1) { return { matches: q.indexOf('reduce') > -1, media: q, addEventListener: function () {}, removeEventListener: function () {} }; } return mm(q); }; }

/* Refraction flag (head-scripts.ts glassRefractScript). */
try { if (navigator.userAgentData && CSS.supports('backdrop-filter', 'url(#lg-refract)')) root.dataset.refract = ''; } catch (e) {}

/* Links: other pages are not built yet, so keep the reviewer on Home. */
document.addEventListener('click', function (e) { var a = e.target.closest('a[href]'); if (a && a.getAttribute('href').charAt(0) !== '#') e.preventDefault(); });

/* ThemeToggle (mirrors src/components/layout/theme-toggle.tsx) */
var SUN = null, MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-[18px]"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>';
var toggle = document.querySelector('button[aria-label^="Use "]');
function syncToggle() { if (!toggle) return; if (!SUN) SUN = toggle.innerHTML; var dark = root.dataset.theme !== 'light'; toggle.innerHTML = dark ? SUN : MOON; toggle.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme'); }
if (toggle) { syncToggle(); toggle.addEventListener('click', function () { root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; syncToggle(); try { parent.postMessage({ themeChanged: root.dataset.theme }, '*'); } catch (e) {} }); }

/* MobileMenu (mirrors src/components/layout/mobile-menu.tsx) */
document.querySelectorAll('button[aria-expanded]').forEach(function (btn) {
  var panel = btn.parentElement.querySelector('[hidden], #' + (btn.getAttribute('aria-controls') || 'x'));
  var closedIcon = btn.innerHTML;
  var X = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  function set(open) { btn.setAttribute('aria-expanded', open); if (panel) panel.hidden = !open; btn.innerHTML = open ? X : closedIcon; if (open && panel) { var f = panel.querySelector('a,button'); f && f.focus(); } }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
});

/* RevealObserver (mirrors src/components/motion/reveal-observer.tsx) */
(function () {
  if (RM) return;
  var targets = Array.prototype.slice.call(document.body.querySelectorAll('[data-reveal]'));
  var vh = innerHeight;
  var pending = targets.filter(function (el) { if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('is-revealed'); return false; } return true; });
  root.dataset.reveal = 'on';
  var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-revealed'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  pending.forEach(function (el) { io.observe(el); });
})();

/* CardLight (mirrors src/components/motion/card-light.tsx) */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) document.addEventListener('pointermove', function (ev) { var c = ev.target.closest && ev.target.closest('.card-lit'); if (!c) return; var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); c.style.setProperty('--my', (ev.clientY - r.top) + 'px'); }, { passive: true });
`;

const boot = `
/* Same engines as the site (src/components/motion/hangul-story.ts, src/components/ui/glass-light.ts). */
document.querySelectorAll('[data-hangul-story]').forEach(function (layer) {
  startHangulStory(layer, layer.parentElement, JSON.parse(layer.dataset.hangulStory));
});
startGlassLight();
`;

const runtime = `(function(){\n${shims}\n${transpile("src/components/motion/hangul-story.ts")}\n${transpile("src/components/ui/glass-light.ts")}\n${boot}\n})();`;

const doc = (styles, reduced) =>
  `<!doctype html><html${htmlAttrs}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fonts}<style>${styles}</style></head>` +
  body.replace("</body>", `<script>${reduced ? "window.__RM=1;" : ""}${runtime}</script></body>`) +
  "</html>";

const docs = { full: doc(css, false), reduced: doc(reducedCss, true) };
const shell = readFileSync(join(root, "scripts/motion-preview-shell.html"), "utf8").replace(
  "/*DOCS*/",
  `var DOCS=${JSON.stringify(docs).replace(/<\//g, "<\\/")};`,
);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, shell);
console.log(`Wrote ${out} (${(shell.length / 1024).toFixed(0)} KB)`);
