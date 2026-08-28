import type { SkillCategoryDto } from "@/data/portfolio.types";

import { SkillIcon } from "./skill-icons";

export function SkillsSection({
  categories,
}: {
  categories: SkillCategoryDto[];
}) {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-2">
      {categories.map((category) => (
        <article
          key={category.slug}
          className={`flex h-full min-h-[25rem] flex-col justify-center rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-10 lg:p-12 ${category.presentation === "badges" ? "lg:col-span-2" : ""}`}
        >
          <header className="text-center">
            <h3 className="font-heading text-2xl font-semibold tracking-[-0.03em]">
              {category.title}
            </h3>
            <p className="mx-auto mt-3 max-w-sm leading-7 text-muted-foreground">
              {category.description}
            </p>
          </header>

          {category.presentation === "iconTiles" ? (
            <ul className="grid grid-cols-2 place-content-center gap-x-6 gap-y-10 pt-10 sm:grid-cols-4 lg:gap-x-8">
              {category.skills.map((skill) => (
                <li
                  key={skill.slug}
                  className="flex min-w-0 flex-col items-center gap-3 text-center"
                >
                  <SkillIcon iconKey={skill.iconKey} />
                  <span className="text-sm leading-tight">{skill.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-wrap content-center justify-center gap-3 pt-10">
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
  );
}
