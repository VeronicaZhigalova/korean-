/*
  Inline scripts that run before first paint. They live outside the client
  components that use them so the server layout receives the strings
  themselves, not client references.
*/

export const themeStorageKey = "sik-theme";

/** Applies the stored theme before paint so it never flashes. Dark is the default. */
export const themeInitScript = `try{var t=localStorage.getItem("${themeStorageKey}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

/** Marks browsers that render SVG filters in backdrop-filter (Chromium) for liquid glass refraction. */
export const glassRefractScript = `try{if(navigator.userAgentData&&CSS.supports("backdrop-filter","url(#lg-refract)"))document.documentElement.dataset.refract=""}catch(e){}`;
