import type { ConversationMessage } from "../types";

const STORAGE_KEY = "chess-to-me:conversation-history";
const MAX_CONVERSATIONS = 10;

/**
 * Load conversation history from Electron Store
 */
export async function loadConversationHistory(): Promise<ConversationMessage[]> {
  try {
    if (typeof window === "undefined" || !window.electronAPI) {
      return [];
    }

    // Try to get from localStorage first (for testing)
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }

    return [];
  } catch (error) {
    console.error("Failed to load conversation history:", error);
    return [];
  }
}

/**
 * Save conversation history to Electron Store
 */
export async function saveConversationHistory(history: ConversationMessage[]): Promise<void> {
  try {
    // Cap at MAX_CONVERSATIONS
    const capped = history.slice(-MAX_CONVERSATIONS);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    }
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
}

/**
 * Add user message and response to conversation history
 */
export function addToConversationHistory(
  history: ConversationMessage[],
  userMessage: string,
  assistantMessage: string
): ConversationMessage[] {
  const now = Date.now();

  const updated = [
    ...history,
    {
      role: "user" as const,
      message: userMessage,
      timestamp: now
    },
    {
      role: "assistant" as const,
      message: assistantMessage,
      timestamp: now + 1
    }
  ];

  // Keep only last 10 conversations
  return updated.slice(-MAX_CONVERSATIONS * 2); // *2 because each conversation is 2 messages
}

/**
 * Format conversation history for LLM context
 */
export function formatConversationForContext(history: ConversationMessage[]): string {
  if (history.length === 0) {
    return "";
  }

  return history
    .map((msg) => {
      const roleLabel = msg.role === "user" ? "User" : "Assistant";
      return `${roleLabel}: ${msg.message}`;
    })
    .join("\n\n");
}

/**
 * Clear conversation history
 */
export async function clearConversationHistory(): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to clear conversation history:", error);
  }
}

/**
 * Get count of stored conversations (pairs of user + assistant messages)
 */
export function getConversationCount(history: ConversationMessage[]): number {
  return Math.floor(history.length / 2);
}
