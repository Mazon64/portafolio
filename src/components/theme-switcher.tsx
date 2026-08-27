"use client";

import { useSyncExternalStore } from "react";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeSwitcherProps = {
  labels: {
    theme: string;
    system: string;
    light: string;
    dark: string;
  };
};

const themeIcons = {
  system: LaptopIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const subscribe = () => () => {};

export function ThemeSwitcher({ labels }: ThemeSwitcherProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { theme = "system", setTheme } = useTheme();
  const ThemeIcon = themeIcons[theme as keyof typeof themeIcons] ?? LaptopIcon;

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label={labels.theme}>
        <LaptopIcon />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.theme}
          />
        }
      >
        <ThemeIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuLabel>{labels.theme}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="system" closeOnClick>
            <LaptopIcon />
            {labels.system}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" closeOnClick>
            <SunIcon />
            {labels.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" closeOnClick>
            <MoonIcon />
            {labels.dark}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
