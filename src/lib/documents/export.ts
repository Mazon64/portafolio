import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";

import { DocumentKind } from "@/generated/prisma/client";
import {
  atsArtifactSchema,
  coverLetterArtifactSchema,
} from "./schemas";

type DocumentLine = { text: string; heading?: boolean; spacer?: boolean };

const regularFontBytes = readFile(
  path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans",
    "files",
    "noto-sans-latin-ext-400-normal.woff",
  ),
);

function artifactLines(kind: DocumentKind, content: unknown): DocumentLine[] {
  if (kind === DocumentKind.ATS_CV) {
    const value = atsArtifactSchema.parse(content);
    const headings =
      value.locale === "es"
        ? {
            summary: "RESUMEN",
            skills: "HABILIDADES",
            experience: "EXPERIENCIA",
            projects: "PROYECTOS",
            education: "EDUCACIÓN",
          }
        : {
            summary: "SUMMARY",
            skills: "SKILLS",
            experience: "EXPERIENCE",
            projects: "PROJECTS",
            education: "EDUCATION",
          };
    const lines: DocumentLine[] = [
      { text: value.name, heading: true },
      { text: value.headline },
      { text: value.contact.join(" | ") },
      { text: headings.summary, heading: true, spacer: true },
      { text: value.summary },
      { text: headings.skills, heading: true, spacer: true },
      { text: value.skills.join(" | ") },
    ];
    for (const [heading, entries] of [
      [headings.experience, value.experience],
      [headings.projects, value.projects],
      [headings.education, value.education],
    ] as const) {
      if (entries.length === 0) continue;
      lines.push({ text: heading, heading: true, spacer: true });
      for (const entry of entries) {
        lines.push({ text: entry.title, heading: true, spacer: true });
        lines.push({ text: `${entry.subtitle} | ${entry.period}` });
        lines.push(...entry.bullets.map((bullet) => ({ text: `• ${bullet}` })));
      }
    }
    return lines;
  }

  if (kind === DocumentKind.COVER_LETTER) {
    const value = coverLetterArtifactSchema.parse(content);
    return [
      { text: value.subject, heading: true },
      { text: value.salutation, spacer: true },
      ...value.paragraphs.map((text) => ({ text, spacer: true })),
      { text: value.closing, spacer: true },
      { text: value.name },
    ];
  }

  throw new RangeError("Public CV artifacts are rendered as HTML");
}

export async function exportArtifactDocx(
  kind: DocumentKind,
  content: unknown,
): Promise<Buffer> {
  const children = artifactLines(kind, content).map(
    (line) =>
      new Paragraph({
        spacing: { before: line.spacer ? 220 : 40, after: 80 },
        children: [
          new TextRun({
            text: line.text,
            bold: line.heading,
            size: line.heading ? 24 : 20,
            font: "Arial",
          }),
        ],
      }),
  );
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text
    .split(/\s+/)
    .flatMap((word) => {
      if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
      const chunks: string[] = [];
      let chunk = "";
      for (const character of word) {
        const candidate = `${chunk}${character}`;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !chunk) {
          chunk = candidate;
        } else {
          chunks.push(chunk);
          chunk = character;
        }
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function exportArtifactPdf(
  kind: DocumentKind,
  content: unknown,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(await regularFontBytes);
  const bold = regular;
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 54;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  for (const line of artifactLines(kind, content)) {
    const font = line.heading ? bold : regular;
    const size = line.heading ? 11 : 9.5;
    if (line.spacer) y -= 8;
    for (const wrapped of wrapText(line.text, pageSize[0] - margin * 2, font, size)) {
      if (y < margin + 16) {
        page = pdf.addPage(pageSize);
        y = pageSize[1] - margin;
      }
      page.drawText(wrapped, { x: margin, y, font, size, color: rgb(0.08, 0.08, 0.08) });
      y -= size + 4;
    }
  }
  return pdf.save();
}
