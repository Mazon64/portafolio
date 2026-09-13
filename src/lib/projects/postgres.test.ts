import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

const rawQuery = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ $queryRaw: rawQuery }) }));
import { retrieveProjectSources } from "@/data/project-knowledge";

let db: PGlite;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const embedding = `[${Array(768).fill(1).join(",")}]`;

beforeAll(async () => {
  db = new PGlite({ extensions: { vector } });
  await db.exec(`CREATE SCHEMA extensions; CREATE EXTENSION vector WITH SCHEMA extensions;
    CREATE TABLE "Project" (id uuid PRIMARY KEY, slug text UNIQUE NOT NULL, "showOnPortfolio" boolean NOT NULL DEFAULT false);`);
  await db.exec(await readFile("prisma/migrations/20260909220000_project_integration/migration.sql", "utf8"));
  rawQuery.mockImplementation(async (query: Prisma.Sql) => (await db.query(query.text, query.values)).rows);
}, 30_000);
afterEach(async () => { await db.exec('DELETE FROM "Project"'); });
afterAll(async () => { await db.close(); });

async function project(n: number, visible = true, enabled = true) {
  await db.query('INSERT INTO "Project" (id,slug,"showOnPortfolio") VALUES ($1,$2,$3)', [id(n), `project-${n}`, visible]);
  await db.query('INSERT INTO "ProjectIntegration" ("projectId","repositoryId","sourcePaths",enabled,"updatedAt") VALUES ($1,$2,$3,$4,now())', [id(n), String(n), ["README.md"], enabled]);
}
async function corpus(projectId: number, knowledgeId: number, status: "DRAFT" | "PUBLISHED") {
  await db.query(`INSERT INTO "ProjectKnowledge" (id,"projectId",status,"commitSha","repositoryFullName","configurationUpdatedAt","projectUpdatedAt",narrative,"generationModel","embeddingModel","publishedAt")
    VALUES ($1,$2,$3,'commit','owner/repo',now(),now(),'{}','test','gemini-embedding-001',$4)`,
  [id(knowledgeId), id(projectId), status, status === "PUBLISHED" ? new Date() : null]);
  await db.query(`INSERT INTO "ProjectKnowledgeChunk" (id,"knowledgeId",path,ordinal,content,"sourceHash","sourceUrl",embedding)
    VALUES ($1,$2,'README.md',0,$3,'hash','https://github.com/owner/repo/blob/commit/README.md',$4::extensions.vector)`,
  [id(knowledgeId + 1000), id(knowledgeId), `${status} source`, embedding]);
}

describe("project integration with isolated PostgreSQL and pgvector", () => {
  it("retains the previous published corpus when automatic replacement fails", async () => {
    await project(1); await corpus(1, 11, "PUBLISHED");
    await expect(db.transaction(async (tx) => {
      await tx.query('DELETE FROM "ProjectKnowledge" WHERE "projectId"=$1', [id(1)]);
      await tx.query(`INSERT INTO "ProjectKnowledge" (id,"projectId",status,"commitSha","repositoryFullName","configurationUpdatedAt","projectUpdatedAt",narrative,"generationModel","embeddingModel","publishedAt")
        VALUES ($1,$2,'PUBLISHED','new','owner/repo',now(),now(),'{}','test','gemini-embedding-001',now())`, [id(12), id(1)]);
      await tx.query(`INSERT INTO "ProjectKnowledgeChunk" (id,"knowledgeId",path,ordinal,content,"sourceHash","sourceUrl",embedding)
        VALUES ($1,$2,'README.md',0,'invalid','hash','https://github.com/owner/repo','[1,2]'::extensions.vector)`, [id(1012), id(12)]);
    })).rejects.toThrow();
    const results = await retrieveProjectSources("project-1", embedding);
    expect(results).toHaveLength(1); expect(results[0].knowledgeId).toBe(id(11));
  });
  it("retrieves only the requested project's published corpus", async () => {
    await project(1); await corpus(1, 11, "PUBLISHED"); await corpus(1, 12, "DRAFT");
    await project(2); await corpus(2, 21, "PUBLISHED");
    const results = await retrieveProjectSources("project-1", embedding);
    expect(results).toHaveLength(1);
    expect(results[0].knowledgeId).toBe(id(11));
    expect(results[0].content).toBe("PUBLISHED source");
    expect(results[0].distance).toBeCloseTo(0);
  });
  it("excludes hidden projects and disabled integrations from actual vector SQL", async () => {
    await project(1, false); await corpus(1, 11, "PUBLISHED");
    await project(2, true, false); await corpus(2, 21, "PUBLISHED");
    expect(await retrieveProjectSources("project-1", embedding)).toEqual([]);
    expect(await retrieveProjectSources("project-2", embedding)).toEqual([]);
  });
  it("enforces one corpus per state and atomically replaces published sources", async () => {
    await project(1); await corpus(1, 11, "PUBLISHED"); await corpus(1, 12, "DRAFT");
    await expect(corpus(1, 13, "DRAFT")).rejects.toThrow();
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM "ProjectKnowledge" WHERE id=$1', [id(11)]);
      await tx.query('UPDATE "ProjectKnowledge" SET status=\'PUBLISHED\',"publishedAt"=now() WHERE id=$1', [id(12)]);
    });
    const results = await retrieveProjectSources("project-1", embedding);
    expect(results).toHaveLength(1); expect(results[0].knowledgeId).toBe(id(12));
    expect((await db.query('SELECT count(*)::int AS count FROM "ProjectKnowledgeChunk"')).rows[0]).toEqual({ count: 1 });
  });
  it("deduplicates deliveries and removes all integration data with a project", async () => {
    await project(1); await corpus(1, 11, "DRAFT");
    await db.query(`INSERT INTO "ProjectSyncJob" (id,"projectId","deliveryId","configurationUpdatedAt") VALUES ($1,$2,'delivery',now())`, [id(100), id(1)]);
    await expect(db.query(`INSERT INTO "ProjectSyncJob" (id,"projectId","deliveryId","configurationUpdatedAt") VALUES ($1,$2,'delivery',now())`, [id(101), id(1)])).rejects.toThrow();
    await db.query('DELETE FROM "Project" WHERE id=$1', [id(1)]);
    for (const table of ["ProjectIntegration", "ProjectSyncJob", "ProjectKnowledge", "ProjectKnowledgeChunk"]) {
      expect((await db.query(`SELECT count(*)::int AS count FROM "${table}"`)).rows[0]).toEqual({ count: 0 });
    }
  });
  it("rejects invalid vector dimensions and processing without a lease", async () => {
    await project(1); await corpus(1, 11, "DRAFT");
    await expect(db.query('UPDATE "ProjectKnowledgeChunk" SET embedding=$1::extensions.vector', ["[1,2]"])).rejects.toThrow();
    await expect(db.query(`INSERT INTO "ProjectSyncJob" (id,"projectId","deliveryId","configurationUpdatedAt",status) VALUES ($1,$2,'lease-test',now(),'PROCESSING')`, [id(100), id(1)])).rejects.toThrow();
  });
});
