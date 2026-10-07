import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  de: () => import("./dictionaries/de.json").then((module) => module.default),
};

export const getLocale = async (): Promise<Locale> => {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return locale;
};

export const getDictionary = async (): Promise<Dictionary> => {
  const locale = await getLocale();
  return dictionaries[locale]();
};
