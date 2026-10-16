import type { ChatSource } from "./schemas";

// Profile/site records ground the answer internally, but are not documentary
// citations. Keep the same rule for existing conversations without rewriting them.
export function chatCitations(sources: ChatSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (source.action || !source.id.startsWith("chunk:") || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}
