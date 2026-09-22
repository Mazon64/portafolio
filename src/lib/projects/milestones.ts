import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SourceChunk } from "./github";
import { localizedText, milestonesSchema, type ProjectMilestones } from "./schemas";

export const generatedMilestonesSchema = z.array(z.object({
  previousId: z.string().nullable(),
  title: localizedText,
  status: z.enum(["completed", "pending", "unverified"]),
  reason: localizedText,
  citations: z.array(z.object({ sourceId: z.string(), quote: z.string().trim().min(20).max(800) })).max(3),
})).max(20);

// Images, dependency declarations and file names alone cannot establish a goal's completion.
export function milestoneSources(chunks: SourceChunk[]) {
  return chunks.filter((chunk) => !/\.(png|jpe?g|webp)$/i.test(chunk.path) && chunk.path !== "GitHub metadata" &&
    !/(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|pom\.xml|composer\.json)$/.test(chunk.path))
    .map((chunk, index) => ({ id: `source-${index}`, ...chunk }));
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function resolveMilestones(value: unknown, chunks: SourceChunk[], previous: ProjectMilestones): ProjectMilestones {
  const generated = generatedMilestonesSchema.parse(value);
  const sources = new Map(milestoneSources(chunks).map((source) => [source.id, source]));
  const previousById = new Map(previous.map((milestone) => [milestone.id, milestone]));
  const seen = new Set<string>();
  const titles = new Set<string>();
  const result = generated.map((milestone) => {
    if (milestone.previousId !== null) {
      if (!previousById.has(milestone.previousId) || seen.has(milestone.previousId)) throw new Error("Milestone identities changed during generation");
      seen.add(milestone.previousId);
    }
    const titleKey = normalize(milestone.title.en).toLowerCase();
    if (titles.has(titleKey)) throw new Error("Duplicate generated milestone");
    titles.add(titleKey);
    const citations = milestone.citations.map(({ sourceId, quote }) => {
      const source = sources.get(sourceId);
      if (!source || !normalize(source.content).includes(normalize(quote))) throw new Error("Milestone evidence is unsupported");
      return { path: source.path, url: source.sourceUrl, sourceHash: source.sourceHash, quote };
    });
    if (!citations.length && (milestone.previousId === null || milestone.status !== "unverified")) throw new Error("Milestone evidence is missing");
    return {
      id: milestone.previousId ?? `goal-${randomUUID()}`, title: milestone.title,
      weight: 1, completed: milestone.status === "completed", evidence: citations[0]?.url ?? "",
      assessment: { status: milestone.status, reason: milestone.reason, citations },
    };
  });
  // A smaller discovery window must not silently remove unfinished goals or inflate progress.
  if (seen.size !== previous.length) throw new Error("Milestone identities changed during generation");
  return milestonesSchema.parse(result);
}
