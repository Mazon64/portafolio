import { ExperienceForm } from "./experience-form";
import { getAdminExperiences } from "@/data/admin/experience";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";

export default async function ExperiencePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const records = await getAdminExperiences();
  const copy = adminCopy[lang].experience;

  return <div><p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.description}</p><div className="mt-12 space-y-6"><details className="group" open={records.length === 0}><summary className="cursor-pointer font-mono text-sm font-medium">+ {copy.create}</summary><div className="mt-4"><ExperienceForm copy={copy} /></div></details>{records.map((record) => <details key={record.id} className="group"><summary className="cursor-pointer py-3 text-lg font-medium">{record.company} · {record.en.role}</summary><ExperienceForm experience={record} copy={copy} /></details>)}</div></div>;
}
