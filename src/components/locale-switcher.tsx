"use client";

import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLocalizedUrl, type Locale } from "@/i18n/config";

type LocaleSwitcherProps = {
  locale: Locale;
  labels: {
    language: string;
    spanish: string;
    english: string;
  };
};

export function LocaleSwitcher({ locale, labels }: LocaleSwitcherProps) {
  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;

    window.location.assign(getLocalizedUrl(window.location.href, nextLocale));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${labels.language}: ${locale.toUpperCase()}`}
          />
        }
      >
        <LanguagesIcon />
        <span>{locale.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => changeLocale(value as Locale)}
        >
          <DropdownMenuLabel>{labels.language}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="es" closeOnClick>
            {labels.spanish}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en" closeOnClick>
            {labels.english}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
