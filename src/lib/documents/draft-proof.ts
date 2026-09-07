import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getProofSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

export function createDocumentDraftProof(value: unknown) {
  return createHmac("sha256", getProofSecret()).update(JSON.stringify(value)).digest("hex");
}

export function verifyDocumentDraftProof(value: unknown, proof: string) {
  if (!/^[a-f0-9]{64}$/.test(proof)) return false;
  const expected = Buffer.from(createDocumentDraftProof(value), "hex");
  const received = Buffer.from(proof, "hex");
  return timingSafeEqual(expected, received);
}
