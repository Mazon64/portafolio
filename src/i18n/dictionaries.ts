import "server-only";

import type { Locale } from "./config";

const dictionaries = {
  es: () => import("./dictionaries/es.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

export type Dictionary = {
  metadata: {
    title: string;
    description: string;
  };
  home: {
    eyebrow: string;
    heading: string;
    name: string;
    introduction: string;
  };
  navigation: {
    menu: string;
    menuDescription: string;
    close: string;
    about: string;
    skills: string;
    projects: string;
    experience: string;
    education: string;
    contact: string;
  };
  preferences: {
    language: string;
    spanish: string;
    english: string;
    theme: string;
    system: string;
    light: string;
    dark: string;
  };
  sections: {
    about: SectionCopy;
    skills: SectionCopy;
    projects: SectionCopy;
    experience: SectionCopy;
    education: SectionCopy;
    contact: SectionCopy;
  };
  contact: {
    linkedin: string;
    github: string;
    email: string;
  };
  chat: {
    label: string;
    unavailable: string;
  };
};

type SectionCopy = {
  number: string;
  title: string;
  description: string;
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
