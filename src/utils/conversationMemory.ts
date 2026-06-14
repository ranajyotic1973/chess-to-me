import type { ConversationMessage } from "../types";

const MAX_MESSAGES = 20; // 10 pairs of user+assistant

function getElectronAPI() {
  return typeof window !== "undefined" ? (window as any).electronAPI : null;
}

export async function loadConversationHistory(mode = "analysis"): Promise<ConversationMessage[]> {
  try {
    const api = getElectronAPI();
    if (api?.loadConversation) {
      const result = await api.loadConversation({ mode });
      return Array.isArray(result?.history) ? result.history : [];
    }
    // Fallback for test environments
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(`chess-to-me:conversation-${mode}`);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return [];
}

export async function saveConversationHistory(history: ConversationMessage[], mode = "analysis"): Promise<void> {
  try {
    const api = getElectronAPI();
    if (api?.saveConversation) {
      await api.saveConversation({ mode, history });
      return;
    }
    // Fallback for test environments
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`chess-to-me:conversation-${mode}`, JSON.stringify(history.slice(-MAX_MESSAGES)));
    }
  } catch {}
}

export function addToConversationHistory(
  history: ConversationMessage[],
  userMessage: string,
  assistantMessage: string
): ConversationMessage[] {
  const now = Date.now();
  const updated = [
    ...history,
    { role: "user" as const, message: userMessage, timestamp: now },
    { role: "assistant" as const, message: assistantMessage, timestamp: now + 1 }
  ];
  return updated.slice(-MAX_MESSAGES);
}

export function formatConversationForContext(history: ConversationMessage[]): string {
  if (history.length === 0) return "";
  return history
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.message}`)
    .join("\n\n");
}

export async function clearConversationHistory(mode = "analysis"): Promise<void> {
  await saveConversationHistory([], mode);
}

export function getConversationCount(history: ConversationMessage[]): number {
  return Math.floor(history.length / 2);
}
