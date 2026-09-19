-- Expand-only: apply through the protected main workflow before CHAT_ENABLED.
BEGIN;
CREATE TABLE "ChatConversation" (
  "id" UUID PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "locale" "Locale" NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lockToken" UUID,
  "lockUntil" TIMESTAMPTZ(3),
  CHECK (("lockToken" IS NULL) = ("lockUntil" IS NULL))
);
CREATE INDEX "ChatConversation_pinned_lastActivityAt_idx" ON "ChatConversation"("pinned", "lastActivityAt" DESC);
CREATE INDEX "ChatConversation_expiresAt_idx" ON "ChatConversation"("expiresAt");
CREATE TABLE "ChatTurn" (
  "id" UUID PRIMARY KEY,
  "conversationId" UUID NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
  "requestId" UUID NOT NULL,
  "locale" "Locale" NOT NULL,
  "context" JSONB NOT NULL,
  "scope" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','COMPLETE','FAILED')),
  "failureCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ChatTurn_conversationId_requestId_key" ON "ChatTurn"("conversationId", "requestId");
CREATE INDEX "ChatTurn_conversationId_updatedAt_id_idx" ON "ChatTurn"("conversationId", "updatedAt" DESC, "id");
CREATE TABLE "ChatMessage" (
  "id" UUID PRIMARY KEY,
  "turnId" UUID NOT NULL REFERENCES "ChatTurn"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('USER','ASSISTANT')),
  "content" TEXT NOT NULL,
  "sources" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("sources") = 'array'),
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX "ChatMessage_turnId_role_key" ON "ChatMessage"("turnId", "role");
CREATE INDEX "ChatMessage_pinned_createdAt_idx" ON "ChatMessage"("pinned", "createdAt");
-- Visitor access is mediated by the server cookie boundary, never by PostgREST.
ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatTurn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ChatConversation", "ChatTurn", "ChatMessage" FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "ChatConversation", "ChatTurn", "ChatMessage" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
