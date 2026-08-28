"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import type { SkillCategoryDto } from "@/data/portfolio.types";

import { SkillIcon } from "./skill-icons";

export function SkillsSection({
  categories,
  copy,
}: {
  categories: SkillCategoryDto[];
  copy: {
    label: string;
    previous: string;
    next: string;
  };
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    scrollLeft: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  function updatePosition() {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(track.scrollLeft >= maxScroll - 2);
  }

  function centerNearestCard(
    behavior: ScrollBehavior = "smooth",
    projectedScroll = 0,
  ) {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>("[data-skill-card]"),
    );
    const viewportCenter =
      track.scrollLeft + track.clientWidth / 2 + projectedScroll;
    const nearest = cards.reduce((selected, card) => {
      const selectedDistance = Math.abs(
        selected.offsetLeft + selected.offsetWidth / 2 - viewportCenter,
      );
      const cardDistance = Math.abs(
        card.offsetLeft + card.offsetWidth / 2 - viewportCenter,
      );
      return cardDistance < selectedDistance ? card : selected;
    }, cards[0]);

    if (!nearest) return;
    track.scrollTo({
      left: nearest.offsetLeft + nearest.offsetWidth / 2 - track.clientWidth / 2,
      behavior,
    });
  }

  function settleOnCard(velocity = 0) {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const projectedScroll = Math.max(-320, Math.min(320, -velocity * 180));

    setIsDragging(false);
    setIsSettling(!reducedMotion);
    centerNearestCard(reducedMotion ? "auto" : "smooth", projectedScroll);

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    if (!reducedMotion) {
      settleTimerRef.current = setTimeout(() => {
        setIsSettling(false);
      }, 450);
    }
  }

  function moveCard(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>("[data-skill-card]"),
    );
    const viewportCenter = track.scrollLeft + track.clientWidth / 2;
    const currentIndex = cards.reduce((selectedIndex, card, index) => {
      const selected = cards[selectedIndex];
      const selectedDistance = Math.abs(
        selected.offsetLeft + selected.offsetWidth / 2 - viewportCenter,
      );
      const cardDistance = Math.abs(
        card.offsetLeft + card.offsetWidth / 2 - viewportCenter,
      );
      return cardDistance < selectedDistance ? index : selectedIndex;
    }, 0);
    const target = cards[Math.max(0, Math.min(cards.length - 1, currentIndex + direction))];

    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const cards = Array.from(
        track.querySelectorAll<HTMLElement>("[data-skill-card]"),
      );
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const contentWidth =
        cards.reduce((total, card) => total + card.offsetWidth, 0) +
        Math.max(0, cards.length - 1) * gap;
      const hasOverflow = contentWidth > track.clientWidth;

      setCanScroll(hasOverflow);
      if (!hasOverflow) {
        track.scrollTo({ left: 0, behavior: "auto" });
        dragRef.current = null;
        setIsDragging(false);
        setIsSettling(false);
        setAtStart(true);
        setAtEnd(true);
      } else {
        updatePosition();
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track
      .querySelectorAll<HTMLElement>("[data-skill-card]")
      .forEach((card) => observer.observe(card));
    window.addEventListener("resize", measure);
    measure();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [categories]);

  return (
    <div
      role="region"
      aria-label={copy.label}
      className="relative left-1/2 w-screen -translate-x-1/2"
    >
      {canScroll && !atStart && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background via-background/85 to-transparent sm:w-28" />
      )}
      {canScroll && !atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background via-background/85 to-transparent sm:w-28" />
      )}

      {canScroll && !atStart && (
        <button
          type="button"
          aria-label={copy.previous}
          onClick={() => moveCard(-1)}
          className="absolute top-1/2 left-4 z-20 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-8"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </button>
      )}
      {canScroll && !atEnd && (
        <button
          type="button"
          aria-label={copy.next}
          onClick={() => moveCard(1)}
          className="absolute top-1/2 right-4 z-20 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-8"
        >
          <ChevronRightIcon aria-hidden="true" className="size-5" />
        </button>
      )}

      <div
        ref={trackRef}
        tabIndex={canScroll ? 0 : -1}
        onScroll={updatePosition}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveCard(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveCard(1);
          }
        }}
        onPointerDown={(event) => {
          if (!canScroll || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
          setIsSettling(false);
          setIsDragging(true);
          dragRef.current = {
            startX: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
            lastX: event.clientX,
            lastTime: performance.now(),
            velocity: 0,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const now = performance.now();
          const elapsed = Math.max(1, now - drag.lastTime);

          event.currentTarget.scrollLeft =
            drag.scrollLeft - (event.clientX - drag.startX);
          drag.velocity = (event.clientX - drag.lastX) / elapsed;
          drag.lastX = event.clientX;
          drag.lastTime = now;
        }}
        onPointerUp={(event) => {
          const velocity = dragRef.current?.velocity;
          if (velocity === undefined) return;
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
          settleOnCard(velocity);
        }}
        onPointerCancel={() => {
          const velocity = dragRef.current?.velocity ?? 0;
          dragRef.current = null;
          settleOnCard(velocity);
        }}
        style={{
          paddingInline: canScroll
            ? "max(1.25rem, calc((100vw - min(88vw, 40rem)) / 2))"
            : "1.25rem",
        }}
        className={`grid grid-flow-col grid-rows-[auto_auto_auto] items-stretch gap-x-6 pb-12 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pb-16 ${canScroll ? `auto-cols-[min(88vw,40rem)] cursor-grab touch-pan-y overflow-x-auto overscroll-x-contain active:cursor-grabbing ${isDragging || isSettling ? "snap-none" : "snap-x snap-mandatory"}` : "auto-cols-[min(88vw,40rem)] justify-center overflow-x-hidden"}`}
      >
        {categories.map((category) => (
          <article
            key={category.slug}
            data-skill-card
            className="row-span-3 grid h-full snap-center rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm [grid-template-rows:subgrid] [scroll-snap-stop:always] sm:p-10 lg:p-12"
          >
            <h3 className="flex items-center justify-center text-center font-heading text-2xl font-semibold tracking-[-0.03em]">
              {category.title}
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-center leading-7 text-muted-foreground">
              {category.description}
            </p>

            {category.presentation === "iconTiles" ? (
              <ul className="flex flex-wrap content-center justify-center gap-y-10 pt-8">
                {category.skills.map((skill) => (
                  <li
                    key={skill.slug}
                    className="flex min-w-0 basis-1/2 flex-col items-center gap-3 px-2 text-center sm:basis-1/4"
                  >
                    <SkillIcon iconKey={skill.iconKey} />
                    <span className="text-sm leading-tight">{skill.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-wrap content-center items-center justify-center gap-3 pt-8">
                {category.skills.map((skill) => (
                  <li
                    key={skill.slug}
                    className="inline-flex min-h-11 max-w-full items-center justify-center rounded-full border border-foreground/25 bg-background px-5 py-2.5 text-center text-sm leading-5 text-foreground"
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
