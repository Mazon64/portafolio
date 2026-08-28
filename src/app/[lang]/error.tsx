"use client";

import { useEffect, useRef } from "react";
import { RotateCcwIcon } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const copy = {
  es: {
    eyebrow: "Error de contenido",
    title: "No fue posible cargar el portafolio.",
    description:
      "La información no está disponible temporalmente. Intenta nuevamente en unos momentos.",
    retry: "Reintentar",
  },
  en: {
    eyebrow: "Content error",
    title: "The portfolio could not be loaded.",
    description:
      "The information is temporarily unavailable. Please try again in a moment.",
    retry: "Try again",
  },
} as const;

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const params = useParams<{ lang?: string }>();
  const locale = params.lang === "es" ? "es" : "en";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-[calc(100svh-4rem)] place-items-center px-5 py-20">
      <div role="alert" className="max-w-xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {copy[locale].eyebrow}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-5 font-heading text-4xl font-semibold tracking-[-0.04em] outline-none sm:text-5xl"
        >
          {copy[locale].title}
        </h1>
        <p className="mt-5 leading-7 text-muted-foreground">
          {copy[locale].description}
        </p>
        <Button className="mt-8" size="lg" onClick={retry}>
          <RotateCcwIcon aria-hidden="true" />
          {copy[locale].retry}
        </Button>
      </div>
    </main>
  );
}
