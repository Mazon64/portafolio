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
  };
  navigation: {
    menu: string;
    menuDescription: string;
    close: string;
    skipToContent: string;
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
  };
  contact: {
    number: string;
    title: string;
    linkedin: string;
    github: string;
    email: string;
    newTab: string;
    form: {
      name: string;
      email: string;
      message: string;
      send: string;
      sending: string;
      success: string;
      error: string;
    };
  };
  skillsCarousel: {
    label: string;
    previous: string;
    next: string;
  };
  projects: {
    empty: string;
    imagePlaceholder: string;
    expand: string;
    progress: string;
    technologies: string;
    status: string;
    details: string;
    repository: string;
    prototype: string;
    newTab: string;
    statuses: {
      planned: string;
      inProgress: string;
      paused: string;
      completed: string;
      archived: string;
    };
  };
  loading: {
    portfolio: string;
  };
};

type SectionCopy = {
  number: string;
  title: string;
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
