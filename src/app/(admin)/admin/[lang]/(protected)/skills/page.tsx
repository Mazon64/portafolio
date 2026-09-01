import { getAdminSkillCategories } from "@/data/admin/skills";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { CategoryForm, NewCategoryForm, NewSkillForm, SkillForm } from "./skills-form";

export default async function SkillsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const categories = await getAdminSkillCategories();
  const copy = adminCopy[lang].skills;
  return <div><p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.description}</p><div className="mt-12 space-y-8"><details open={categories.length === 0}><summary className="cursor-pointer font-mono text-sm font-medium">+ {copy.createCategory}</summary><div className="mt-4"><NewCategoryForm copy={copy} /></div></details>{categories.map((category) => <section key={category.id} className="space-y-4"><details><summary className="cursor-pointer py-3 text-xl font-semibold">{category.enTitle}</summary><CategoryForm category={category} copy={copy} /></details><div className="ml-4 space-y-3 border-l border-border pl-4"><details><summary className="cursor-pointer font-mono text-sm">+ {copy.createSkill}</summary><div className="mt-3"><NewSkillForm categoryId={category.id} copy={copy} /></div></details>{category.skills.map((skill) => <details key={skill.id}><summary className="cursor-pointer py-2">{skill.enName}</summary><SkillForm skill={skill} categoryId={category.id} copy={copy} /></details>)}</div></section>)}</div></div>;
}
