import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { chatEnabled } from "@/lib/chat/configuration";
import { chatCookieName, chatCookieOptions, chatTokenHash } from "@/lib/chat/identity";
import { chatInputSchema } from "@/lib/chat/schemas";
import { ChatRateLimitError, consumeChatQuota } from "@/lib/chat/quota";
import { generateChatAnswer } from "@/lib/chat/answer";
import { ChatStateError, beginChatTurn, failChatTurn, findVisitorConversation, finishChatTurn, inspectChatRequest, recentChatHistory, visitorHistory } from "@/data/chat";
import { boundedBody } from "@/lib/projects/http";
import { projectAiFailureCode } from "@/lib/projects/ai";

export const runtime = "nodejs";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (!chatEnabled()) return NextResponse.json({ status: "disabled" }, { status: 503, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403, headers });
  let input;
  try { input = chatInputSchema.parse(JSON.parse((await boundedBody(request, 8192)).toString("utf8"))); }
  catch { return NextResponse.json({ status: "invalid" }, { status: 400, headers }); }
  const token = (await cookies()).get(chatCookieName())?.value;
  let claim: { turnId: string; conversationId: string; lockToken: string } | undefined;
  try {
    const conversation = await findVisitorConversation(chatTokenHash(token));
    if (!conversation) return NextResponse.json({ status: "expired" }, { status: 401, headers });
    if (input.conversationId !== conversation.id) return NextResponse.json({ status: "conflict", saved: false }, { status: 409, headers });
    const existing = await inspectChatRequest(conversation, input);
    if (existing) return NextResponse.json({ ...await visitorHistory(conversation), status: existing }, { status: existing === "pending" ? 202 : 200, headers });
    await consumeChatQuota(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local", "message");
    const started = await beginChatTurn(conversation, input);
    if (started.kind !== "claimed") return NextResponse.json({ ...await visitorHistory(conversation), status: started.kind }, { status: started.kind === "pending" ? 202 : 200, headers });
    claim = started;
    const history = await recentChatHistory(conversation, started.turnId);
    const result = await generateChatAnswer(input, history);
    await finishChatTurn(started, result.answer, result.sources, result.scope);
    const current = await findVisitorConversation(chatTokenHash(token));
    if (!current) throw new ChatStateError("expired");
    const response = NextResponse.json({ ...await visitorHistory(current), status: "complete" }, { headers });
    response.cookies.set(chatCookieName(), token!, chatCookieOptions(new URL(request.url).protocol === "https:"));
    return response;
  } catch (error) {
    if (claim) { try { await failChatTurn(claim, projectAiFailureCode(error)); } catch { /* Lease expiration permits safe retry after database recovery. */ } }
    const status = error instanceof ChatRateLimitError ? "rate_limited" : error instanceof ChatStateError ? error.code : "unavailable";
    const response = NextResponse.json({ status, saved: Boolean(claim) }, { status: status === "rate_limited" ? 429 : status === "expired" ? 401 : ["busy", "conflict"].includes(status) ? 409 : 503, headers });
    if (claim && token && !["expired", "conflict"].includes(status)) response.cookies.set(chatCookieName(), token, chatCookieOptions(new URL(request.url).protocol === "https:"));
    return response;
  }
}
