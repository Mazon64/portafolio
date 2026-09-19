import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { chatEnabled } from "@/lib/chat/configuration";
import { chatCookieName, chatCookieOptions, chatTokenHash, newChatToken } from "@/lib/chat/identity";
import { ChatRateLimitError, consumeChatQuota } from "@/lib/chat/quota";
import { ChatStateError, createVisitorConversation, findVisitorConversation, visitorHistory } from "@/data/chat";
import { boundedBody } from "@/lib/projects/http";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!chatEnabled()) return NextResponse.json({ enabled: false, preview: process.env.VERCEL_ENV === "preview", conversation: null, turns: [], nextCursor: null }, { headers });
  try {
    const token = (await cookies()).get(chatCookieName())?.value;
    const conversation = await findVisitorConversation(chatTokenHash(token));
    if (!conversation) return NextResponse.json({ enabled: true, conversation: null, turns: [], nextCursor: null }, { headers });
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    if (before && !z.uuid().safeParse(before).success) return NextResponse.json({ status: "invalid" }, { status: 400, headers });
    return NextResponse.json(await visitorHistory(conversation, before), { headers });
  } catch (error) { return NextResponse.json({ status: error instanceof ChatStateError ? error.code : "unavailable" }, { status: error instanceof ChatStateError ? 400 : 503, headers }); }
}

export async function POST(request: Request) {
  if (!chatEnabled()) return NextResponse.json({ status: "disabled" }, { status: 503, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403, headers });
  let input;
  try { input = z.object({ accepted: z.literal(true), locale: z.enum(["es", "en"]), restart: z.boolean().optional() }).parse(JSON.parse((await boundedBody(request, 1024)).toString("utf8"))); }
  catch { return NextResponse.json({ status: "invalid" }, { status: 400, headers }); }
  try {
    const previous = (await cookies()).get(chatCookieName())?.value;
    const existing = await findVisitorConversation(chatTokenHash(previous));
    if (existing && !input.restart) return NextResponse.json(await visitorHistory(existing), { headers });
    await consumeChatQuota(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local", "session");
    const token = existing ? previous! : newChatToken();
    const conversation = await createVisitorConversation(chatTokenHash(token)!, input.locale, input.restart ?? false);
    const response = NextResponse.json(await visitorHistory(conversation), { headers });
    response.cookies.set(chatCookieName(), token, chatCookieOptions(new URL(request.url).protocol === "https:"));
    return response;
  } catch (error) {
    return NextResponse.json({ status: error instanceof ChatRateLimitError ? "rate_limited" : "unavailable" }, { status: error instanceof ChatRateLimitError ? 429 : 503, headers });
  }
}
