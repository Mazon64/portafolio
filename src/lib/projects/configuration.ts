import "server-only";
import { isCmsWriteEnabled } from "@/config/env";

export function projectIntegrationEnabled() {
  return isCmsWriteEnabled() && process.env.PROJECT_INTEGRATION_ENABLED?.trim() === "true";
}
export function projectAiEnabled() {
  return projectIntegrationEnabled() && Boolean(process.env.GEMINI_API_KEYS?.trim());
}
export function projectRagEnabled() {
  return projectAiEnabled() && process.env.PROJECT_RAG_ENABLED?.trim() === "true";
}
