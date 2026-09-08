import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { DocumentKind } from "@/generated/prisma/client";
import {
  atsArtifactSchema,
  coverLetterArtifactSchema,
} from "./schemas";

type LineKind =
  | "name"
  | "headline"
  | "contact"
  | "section"
  | "entry"
  | "meta"
  | "body"
  | "bullet"
  | "subject"
  | "salutation"
  | "closing";

type DocumentLine = { text: string; kind: LineKind };

const LETTER_SIZE: [number, number] = [612, 792];
const MARGIN_X = 54;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 46;

function fontFile(weight: 400 | 700) {
  return readFile(
    path.join(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "noto-sans",
      "files",
      `noto-sans-latin-${weight}-normal.woff`,
    ),
  );
}

const regularFontBytes = fontFile(400);
const boldFontBytes = fontFile(700);

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
      { text: value.name, kind: "name" },
      { text: value.headline, kind: "headline" },
      { text: value.contact.join(" | "), kind: "contact" },
      { text: headings.summary, kind: "section" },
      { text: value.summary, kind: "body" },
      { text: headings.skills, kind: "section" },
      { text: value.skills.join(" | "), kind: "body" },
    ];
    for (const [heading, entries] of [
      [headings.experience, value.experience],
      [headings.projects, value.projects],
      [headings.education, value.education],
    ] as const) {
      if (entries.length === 0) continue;
      lines.push({ text: heading, kind: "section" });
      for (const entry of entries) {
        lines.push({ text: entry.title, kind: "entry" });
        lines.push({ text: `${entry.subtitle} | ${entry.period}`, kind: "meta" });
        lines.push(...entry.bullets.map((text) => ({ text, kind: "bullet" as const })));
      }
    }
    return lines;
  }

  if (kind === DocumentKind.COVER_LETTER) {
    const value = coverLetterArtifactSchema.parse(content);
    return [
      { text: value.subject, kind: "subject" },
      { text: value.salutation, kind: "salutation" },
      ...value.paragraphs.map((text) => ({ text, kind: "body" as const })),
      { text: value.closing, kind: "closing" },
      { text: value.name, kind: "entry" },
    ];
  }

  throw new RangeError("Public CV artifacts are rendered as HTML");
}

function sanitizeText(text: string, supportedCharacters: ReadonlySet<number>) {
  return Array.from(text.normalize("NFC"), (character) =>
    supportedCharacters.has(character.codePointAt(0) ?? 0) ? character : " ",
  )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
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

function lineStyle(kind: LineKind) {
  switch (kind) {
    case "name":
      return { size: 20, lineHeight: 24, before: 0, after: 2, bold: true };
    case "headline":
      return { size: 11, lineHeight: 15, before: 0, after: 2, bold: false };
    case "contact":
      return { size: 8.5, lineHeight: 12, before: 0, after: 10, bold: false };
    case "section":
      return { size: 9.5, lineHeight: 13, before: 10, after: 4, bold: true };
    case "entry":
      return { size: 10, lineHeight: 13, before: 5, after: 1, bold: true };
    case "meta":
      return { size: 8.5, lineHeight: 12, before: 0, after: 2, bold: false };
    case "bullet":
      return { size: 9.25, lineHeight: 13, before: 1, after: 1, bold: false };
    case "subject":
      return { size: 12, lineHeight: 17, before: 0, after: 24, bold: true };
    case "salutation":
      return { size: 10.5, lineHeight: 15, before: 0, after: 12, bold: false };
    case "closing":
      return { size: 10.5, lineHeight: 15, before: 12, after: 14, bold: false };
    default:
      return { size: 9.5, lineHeight: 13.5, before: 0, after: 5, bold: false };
  }
}

function drawFooter(page: PDFPage, pageNumber: number, font: PDFFont) {
  const label = String(pageNumber);
  page.drawText(label, {
    x: LETTER_SIZE[0] - MARGIN_X - font.widthOfTextAtSize(label, 7.5),
    y: 24,
    font,
    size: 7.5,
    color: rgb(0.42, 0.45, 0.49),
  });
}

export async function exportArtifactPdf(
  kind: DocumentKind,
  content: unknown,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    pdf.embedFont(await regularFontBytes),
    pdf.embedFont(await boldFontBytes),
  ]);
  const supportedCharacters = new Set(regular.getCharacterSet());
  const contentWidth = LETTER_SIZE[0] - MARGIN_X * 2;
  let page = pdf.addPage(LETTER_SIZE);
  let y = LETTER_SIZE[1] - MARGIN_TOP;

  for (const line of artifactLines(kind, content)) {
    const style = lineStyle(line.kind);
    const font = style.bold ? bold : regular;
    const inset = line.kind === "bullet" ? 12 : 0;
    const prefix = line.kind === "bullet" ? "• " : "";
    const cleanText = sanitizeText(`${prefix}${line.text}`, supportedCharacters);
    const wrapped = wrapText(cleanText, contentWidth - inset, font, style.size);
    const reservedAfter = line.kind === "section" ? 18 : 0;
    const requiredHeight =
      style.before + wrapped.length * style.lineHeight + style.after + reservedAfter;

    if (y - requiredHeight < MARGIN_BOTTOM) {
      page = pdf.addPage(LETTER_SIZE);
      y = LETTER_SIZE[1] - MARGIN_TOP;
    }
    y -= style.before;

    if (line.kind === "section") {
      page.drawLine({
        start: { x: MARGIN_X, y: y + 6 },
        end: { x: LETTER_SIZE[0] - MARGIN_X, y: y + 6 },
        thickness: 0.6,
        color: rgb(0.72, 0.76, 0.8),
      });
    }

    const color =
      line.kind === "contact" || line.kind === "meta"
        ? rgb(0.32, 0.35, 0.39)
        : line.kind === "section"
          ? rgb(0.1, 0.25, 0.38)
          : rgb(0.08, 0.09, 0.1);
    for (const wrappedLine of wrapped) {
      page.drawText(wrappedLine, {
        x: MARGIN_X + inset,
        y,
        font,
        size: style.size,
        color,
      });
      y -= style.lineHeight;
    }
    y -= style.after;
  }

  pdf.getPages().forEach((pdfPage, index) => drawFooter(pdfPage, index + 1, regular));
  pdf.setCreator("davidaranda.dev");
  pdf.setProducer("davidaranda.dev");
  return pdf.save();
}
