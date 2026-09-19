import "server-only";
import { z } from "zod";
import { canRetryWithAnotherKey, DocumentGenerationError, getApiKeyAttempts, getDocumentGenerationModel, providerRejectionCode } from "@/lib/documents/gemini";

export type FunctionDeclaration = { name: string; description: string; parametersJsonSchema: Record<string, unknown> };
export type FunctionPart = { functionCall?: { name: string; args: unknown; id?: string }; [key: string]: unknown };
export type FunctionContent = { role: "user" | "model"; parts: FunctionPart[] };
const contentSchema = z.object({ role: z.literal("model"), parts: z.array(z.object({
  functionCall: z.object({ name: z.string(), args: z.unknown(), id: z.string().optional() }).passthrough().optional(),
}).passthrough()).min(1).max(12) });

// Preserve model parts (including thought signatures) verbatim between tool turns.
export async function requestChatFunctions(instruction: string, contents: FunctionContent[], declarations: FunctionDeclaration[], finalOnly = false): Promise<FunctionContent> {
  const failures: string[] = [];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: instruction }] }, contents,
    tools: [{ functionDeclarations: declarations }],
    toolConfig: { functionCallingConfig: { mode: "ANY", ...(finalOnly ? { allowedFunctionNames: ["respond"] } : {}) } },
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });
  for (const key of getApiKeyAttempts()) {
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${getDocumentGenerationModel()}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body, signal: AbortSignal.timeout(40_000),
      });
    } catch { failures.push("TIMEOUT"); continue; }
    if (!response.ok) {
      const code = await providerRejectionCode(response); failures.push(code);
      if (canRetryWithAnotherKey(response.status, code)) continue;
      throw new DocumentGenerationError(`Chat generation failed: ${failures.join(", ")}`);
    }
    try {
      const data = await response.json() as { candidates?: Array<{ content?: unknown }> };
      const content = contentSchema.parse(data.candidates?.[0]?.content);
      if (!content.parts.some((part) => part.functionCall)) throw new Error("No function call");
      return content;
    } catch { failures.push("INVALID_RESPONSE"); }
  }
  throw new DocumentGenerationError(`Chat generation failed: ${failures.join(", ")}`);
}
