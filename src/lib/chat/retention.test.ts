import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
vi.mock("server-only", () => ({}));
import { pruneConversationMessages } from "./retention";
let db: PGlite;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-09-20T12:00:00Z");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TYPE "Locale" AS ENUM ('es','en');`);
  await db.exec(await readFile("prisma/migrations/20260915100000_contextual_chat/migration.sql", "utf8"));
}, 30_000);
afterEach(async () => { await db.exec('DELETE FROM "ChatConversation"'); });
afterAll(async () => db.close());
async function seed(pinned = false) {
  await db.query(`INSERT INTO "ChatConversation" (id,"tokenHash",locale,pinned,"updatedAt","expiresAt") VALUES ($1,'hash','es',$2,$3,$3)`, [id(1), pinned, now]);
  for (let n = 1; n <= 3; n++) {
    await db.query(`INSERT INTO "ChatTurn" (id,"conversationId","requestId",locale,context) VALUES ($1,$2,$3,'es','{}')`, [id(10 + n), id(1), id(100 + n)]);
    await db.query(`INSERT INTO "ChatMessage" (id,"turnId",role,content,pinned,"createdAt","updatedAt") VALUES ($1,$2,'USER','Synthetic private message',$3,$4,$5)`,
      [id(20 + n), id(10 + n), n === 2, n === 3 ? now : new Date("2026-09-17T12:00:00Z"), now]);
  }
}
async function prune() {
  return db.transaction(async (pg) => {
    const tx = { $executeRaw: async (query: Prisma.Sql) => (await pg.query(query.text, query.values)).affectedRows } as unknown as Prisma.TransactionClient;
    return pruneConversationMessages(tx, id(1), now);
  });
}
describe("private chat schema and retention", () => {
  it("deletes messages at the 72-hour boundary but preserves pinned and recent messages", async () => {
    await seed(); expect(await prune()).toBe(1);
    expect((await db.query('SELECT id FROM "ChatMessage" ORDER BY id')).rows).toEqual([{ id: id(22) }, { id: id(23) }]);
  });
  it("preserves all messages in a pinned conversation", async () => {
    await seed(true); expect(await prune()).toBe(0);
    expect((await db.query('SELECT count(*)::int AS n FROM "ChatMessage"')).rows[0]).toEqual({ n: 3 });
  });
  it("removes children when an administrator deletes a conversation", async () => {
    await seed(); await db.query('DELETE FROM "ChatConversation" WHERE id=$1', [id(1)]);
    expect((await db.query('SELECT count(*)::int AS n FROM "ChatMessage"')).rows[0]).toEqual({ n: 0 });
    expect((await db.query('SELECT count(*)::int AS n FROM "ChatTurn"')).rows[0]).toEqual({ n: 0 });
  });
  it("prevents duplicate requests and duplicate answers for the same turn", async () => {
    await seed();
    await expect(db.query(`INSERT INTO "ChatTurn" (id,"conversationId","requestId",locale,context) VALUES ($1,$2,$3,'es','{}')`, [id(999), id(1), id(101)])).rejects.toThrow();
    await expect(db.query(`INSERT INTO "ChatMessage" (id,"turnId",role,content,"updatedAt") VALUES ($1,$2,'USER','Duplicate',$3)`, [id(999), id(11), now])).rejects.toThrow();
  });
  it("denies direct public-role access even if someone grants table SELECT", async () => {
    await seed();
    await db.exec('CREATE ROLE chat_reader; GRANT USAGE ON SCHEMA public TO chat_reader; GRANT SELECT ON "ChatMessage", "ChatTurn", "ChatConversation" TO chat_reader; SET ROLE chat_reader;');
    try { expect((await db.query('SELECT * FROM "ChatMessage"')).rows).toEqual([]); }
    finally { await db.exec('RESET ROLE'); }
  });
});
