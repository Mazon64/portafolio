import { getAdminEducation } from "@/data/admin/education";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { EducationForm, NewEducationForm } from "./education-form";

export default async function EducationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const records = await getAdminEducation();
  const copy = adminCopy[lang].education;

  return <div><p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.description}</p><div className="mt-12 space-y-6"><details open={records.length === 0}><summary className="cursor-pointer font-mono text-sm font-medium">+ {copy.create}</summary><div className="mt-4"><NewEducationForm copy={copy} /></div></details>{records.map((record) => <details key={record.id}><summary className="cursor-pointer py-3 text-lg font-medium">{record.institution} · {record.enDegree}</summary><EducationForm education={record} copy={copy} /></details>)}</div></div>;
}
