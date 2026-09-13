import { getPrisma } from "@/lib/prisma";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { validBearer } from "@/lib/projects/http";
import { reconcileProjectQueue } from "@/lib/projects/sync";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!projectIntegrationEnabled()) return Response.json({ status: "disabled" }, { status: 503 });
  if (!validBearer(request.headers.get("authorization"), process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  try {
    await getPrisma().projectQueryQuota.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await getPrisma().projectSyncJob.deleteMany({ where: {
      status: { in: ["SUCCEEDED", "SUPERSEDED"] }, finishedAt: { lt: new Date(Date.now() - 30 * 86400_000) },
    } });
    return Response.json(await reconcileProjectQueue(), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable" }, { status: 503 }); }
}
