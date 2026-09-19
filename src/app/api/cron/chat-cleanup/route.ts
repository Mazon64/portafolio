import { isCmsWriteEnabled } from "@/config/env";
import { validBearer } from "@/lib/projects/http";
import { cleanupChat } from "@/lib/chat/retention";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!isCmsWriteEnabled()) return Response.json({ status: "disabled" }, { status: 503 });
  if (!validBearer(request.headers.get("authorization"), process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  try { return Response.json(await cleanupChat(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "unavailable" }, { status: 503 }); }
}
