"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { themeStorageKey } from "./head-scripts";

type Theme = "dark" | "light";

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

type ThemeToggleProps = {
  toDarkLabel: string;
  toLightLabel: string;
};

export const ThemeToggle = ({ toDarkLabel, toLightLabel }: ThemeToggleProps) => {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const apply = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies to this page.
    }
  };

  return (
    <button
      type="button"
      onClick={apply}
      aria-label={next === "dark" ? toDarkLabel : toLightLabel}
      className="header-control inline-grid size-11 place-items-center"
    >
      {theme === "dark" ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
    </button>
  );
};

