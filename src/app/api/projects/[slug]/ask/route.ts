import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { retrieveProjectSources } from "@/data/project-knowledge";
import { projectRagEnabled } from "@/lib/projects/configuration";
import { boundedBody } from "@/lib/projects/http";
import { answerProjectQuestion, embedTexts } from "@/lib/projects/ai";
import { consumeProjectQuestionQuota, ProjectRateLimitError } from "@/lib/projects/quota";

export const runtime = "nodejs";
export const maxDuration = 300;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!projectRagEnabled()) return Response.json({ status: "disabled" }, { status: 503, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ status: "forbidden" }, { status: 403, headers });
  const { slug } = await context.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return Response.json({ status: "invalid" }, { status: 400, headers });
  let body: { question: string; locale: "es" | "en" };
  try {
    body = z.object({ question: z.string().trim().min(5).max(600), locale: z.enum(["es", "en"]) }).parse(
      JSON.parse((await boundedBody(request, 4_096)).toString("utf8")),
    );
  } catch { return Response.json({ status: "invalid" }, { status: 400, headers }); }
  try {
    const corpus = await getPrisma().projectKnowledge.findFirst({
      where: { status: "PUBLISHED", project: { slug, showOnPortfolio: true, integration: { is: { enabled: true } } } },
      select: { id: true },
    });
    if (!corpus) return Response.json({ status: "unavailable" }, { status: 404, headers });
    const identifier = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await consumeProjectQuestionQuota(identifier);
    const [embedding] = await embedTexts([body.question], "RETRIEVAL_QUERY");
    const sources = (await retrieveProjectSources(slug, embedding)).filter((s) => s.knowledgeId === corpus.id && s.distance < 0.65);
    const result = sources.length
      ? await answerProjectQuestion(body.question, body.locale, sources)
      : { answer: body.locale === "es" ? "No hay información suficiente en las fuentes publicadas para responder." : "There is not enough information in the published sources to answer.", sourceIds: [], insufficient: true };
    // Avoid returning a withdrawn or replaced corpus during a long provider call.
    const current = await getPrisma().projectKnowledge.count({ where: { id: corpus.id, status: "PUBLISHED", project: { showOnPortfolio: true, integration: { is: { enabled: true } } } } });
    if (!current) return Response.json({ status: "unavailable" }, { status: 409, headers });
    return Response.json({ answer: result.answer, insufficient: result.insufficient,
      sources: sources.filter((s) => result.sourceIds.includes(s.id)).map((s) => ({ id: s.id, path: s.path, url: s.sourceUrl })),
    }, { headers });
  } catch (error) {
    if (error instanceof ProjectRateLimitError) return Response.json({ status: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
