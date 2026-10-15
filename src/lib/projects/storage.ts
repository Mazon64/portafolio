import "server-only";
import { boundedBody } from "./http";

function storageConfig() {
  const origin = process.env.PROJECT_MEDIA_STORAGE_URL?.trim();
  const token = process.env.PROJECT_MEDIA_STORAGE_KEY?.trim();
  const bucket = process.env.PROJECT_MEDIA_STORAGE_BUCKET?.trim();
  if (!origin || !token || !bucket || !/^[a-z0-9-]{1,63}$/.test(bucket)) throw new Error("Media storage unavailable");
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) throw new Error("Invalid storage origin");
  return { origin: url.origin, token, bucket };
}
export function mediaStorageConfigured() {
  try { storageConfig(); return true; } catch { return false; }
}
async function objectRequest(key: string, method: "GET" | "POST" | "DELETE", bytes?: Uint8Array) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new Error("Invalid media key");
  const config = storageConfig();
  const response = await fetch(`${config.origin}/storage/v1/object/${config.bucket}/${key}`, {
    method, headers: { authorization: `Bearer ${config.token}`, apikey: config.token, ...(method === "POST" ? { "content-type": "image/webp", "x-upsert": "false" } : {}) },
    ...(bytes ? { body: new Uint8Array(bytes).buffer } : {}), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Media storage HTTP ${response.status}`);
  return response;
}
export async function uploadMedia(key: string, bytes: Uint8Array) {
  const config = storageConfig();
  const bucket = await fetch(`${config.origin}/storage/v1/bucket/${config.bucket}`, { headers: { authorization: `Bearer ${config.token}`, apikey: config.token }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!bucket.ok || (JSON.parse((await boundedBody(bucket, 16_000)).toString("utf8")) as { public?: unknown }).public !== false) throw new Error("Project media requires a private bucket");
  await objectRequest(key, "POST", bytes);
}
export async function deleteMedia(key: string) { await objectRequest(key, "DELETE"); }
export async function readMedia(key: string) { return boundedBody(await objectRequest(key, "GET"), 8_000_000); }
