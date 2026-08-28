import type { SkillCategoryDto } from "@/data/portfolio.types";

import { SkillIcon } from "./skill-icons";

export function SkillsSection({
  categories,
}: {
  categories: SkillCategoryDto[];
}) {
  return (
    <div className="relative -mx-5 sm:-mx-8 lg:-mx-12">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background via-background/80 to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/80 to-transparent sm:w-16" />
      <div className="grid snap-x snap-mandatory auto-cols-[min(88vw,40rem)] grid-flow-col grid-rows-[auto_auto_auto] items-stretch gap-x-6 overflow-x-auto overscroll-x-contain scroll-smooth px-8 pb-4 [scroll-padding-inline:2rem] sm:auto-cols-[min(80vw,40rem)] sm:px-12 sm:[scroll-padding-inline:3rem] lg:auto-cols-[40rem] lg:px-16">
        {categories.map((category) => (
          <article
            key={category.slug}
            className="row-span-3 grid h-full snap-start rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm [grid-template-rows:subgrid] [scroll-snap-stop:always] sm:p-10 lg:p-12"
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
