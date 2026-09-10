import { createHmac, timingSafeEqual } from "node:crypto";

export async function boundedBody(response: Pick<Response, "body" | "headers">, max: number): Promise<Buffer> {
  if (Number(response.headers.get("content-length") ?? 0) > max) throw new Error("Body too large");
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new Error("Body too large"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts);
}

export function validGithubSignature(body: Buffer, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export function validBearer(header: string | null, secret: string | undefined) {
  if (!header || !secret) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
