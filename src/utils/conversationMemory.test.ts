import {
  addToConversationHistory,
  formatConversationForContext,
  getConversationCount,
  loadConversationHistory,
  saveConversationHistory,
  clearConversationHistory
} from "./conversationMemory";
import type { ConversationMessage } from "../types";

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = value; },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; }
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ---------------------------------------------------------------------------
// addToConversationHistory
// ---------------------------------------------------------------------------
describe("addToConversationHistory", () => {
  test("adds user and assistant messages to history", () => {
    const updated = addToConversationHistory([], "Hello", "Hi there");
    expect(updated).toHaveLength(2);
    expect(updated[0]).toMatchObject({ role: "user", message: "Hello" });
    expect(updated[1]).toMatchObject({ role: "assistant", message: "Hi there" });
  });

  test("timestamps are set and assistant timestamp is after user", () => {
    const updated = addToConversationHistory([], "Hello", "Hi");
    expect(updated[0].timestamp).toBeGreaterThan(0);
    expect(updated[1].timestamp).toBeGreaterThan(updated[0].timestamp);
  });

  test("appends to existing history", () => {
    const existing: ConversationMessage[] = [
      { role: "user", message: "First", timestamp: 1 },
      { role: "assistant", message: "Reply", timestamp: 2 }
    ];
    const updated = addToConversationHistory(existing, "Second", "Response");
    expect(updated).toHaveLength(4);
  });

  test("caps history at 20 messages (10 pairs)", () => {
    let history: ConversationMessage[] = [];
    for (let i = 0; i < 12; i++) {
      history = addToConversationHistory(history, `Q${i}`, `A${i}`);
    }
    expect(history.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// formatConversationForContext
// ---------------------------------------------------------------------------
describe("formatConversationForContext", () => {
  test("returns empty string for empty history", () => {
    expect(formatConversationForContext([])).toBe("");
  });

  test("formats user messages with 'User:' prefix", () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "What's the best move?", timestamp: 1 }
    ];
    const result = formatConversationForContext(history);
    expect(result).toContain("User: What's the best move?");
  });

  test("formats assistant messages with 'Assistant:' prefix", () => {
    const history: ConversationMessage[] = [
      { role: "assistant", message: "Play e4.", timestamp: 1 }
    ];
    const result = formatConversationForContext(history);
    expect(result).toContain("Assistant: Play e4.");
  });

  test("joins messages with double newline", () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "Q", timestamp: 1 },
      { role: "assistant", message: "A", timestamp: 2 }
    ];
    const result = formatConversationForContext(history);
    expect(result).toContain("User: Q\n\nAssistant: A");
  });
});

// ---------------------------------------------------------------------------
// getConversationCount
// ---------------------------------------------------------------------------
describe("getConversationCount", () => {
  test("returns 0 for empty history", () => {
    expect(getConversationCount([])).toBe(0);
  });

  test("returns 1 for one user+assistant pair", () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "Q", timestamp: 1 },
      { role: "assistant", message: "A", timestamp: 2 }
    ];
    expect(getConversationCount(history)).toBe(1);
  });

  test("returns 3 for three pairs", () => {
    const history: ConversationMessage[] = Array.from({ length: 6 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      message: "msg",
      timestamp: i
    }));
    expect(getConversationCount(history)).toBe(3);
  });

  test("floors on odd-length history", () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "Q", timestamp: 1 }
    ];
    expect(getConversationCount(history)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// loadConversationHistory — uses localStorage
// ---------------------------------------------------------------------------
describe("loadConversationHistory", () => {
  test("returns empty array when nothing stored", async () => {
    const result = await loadConversationHistory();
    expect(result).toEqual([]);
  });

  test("returns stored history from localStorage", async () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "Test", timestamp: 1 }
    ];
    localStorageMock.setItem("chess-to-me:conversation-analysis", JSON.stringify(history));
    const result = await loadConversationHistory();
    expect(result).toEqual(history);
  });

  test("returns empty array when window.electronAPI is null", async () => {
    const saved = (global as any).window.electronAPI;
    (global as any).window.electronAPI = null;
    const result = await loadConversationHistory();
    expect(result).toEqual([]);
    (global as any).window.electronAPI = saved;
  });
});

// ---------------------------------------------------------------------------
// saveConversationHistory — uses localStorage
// ---------------------------------------------------------------------------
describe("saveConversationHistory", () => {
  test("saves history to localStorage", async () => {
    const history: ConversationMessage[] = [
      { role: "user", message: "Q", timestamp: 1 },
      { role: "assistant", message: "A", timestamp: 2 }
    ];
    await saveConversationHistory(history);
    const stored = localStorageMock.getItem("chess-to-me:conversation-analysis");
    expect(JSON.parse(stored!)).toEqual(history);
  });

  test("caps saved history to last 20 entries", async () => {
    const history: ConversationMessage[] = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      message: `msg${i}`,
      timestamp: i
    }));
    await saveConversationHistory(history);
    const stored = JSON.parse(localStorageMock.getItem("chess-to-me:conversation-analysis")!);
    expect(stored.length).toBe(20);
    expect(stored[0].message).toBe("msg5"); // last 20 of 25
  });
});

// ---------------------------------------------------------------------------
// clearConversationHistory — uses localStorage
// ---------------------------------------------------------------------------
describe("clearConversationHistory", () => {
  test("removes history from localStorage", async () => {
    localStorageMock.setItem("chess-to-me:conversation-analysis", "[{\"role\":\"user\",\"message\":\"test\",\"timestamp\":1}]");
    await clearConversationHistory();
    expect(localStorageMock.getItem("chess-to-me:conversation-analysis")).not.toBeNull(); // clear writes [] not removes
    expect(JSON.parse(localStorageMock.getItem("chess-to-me:conversation-analysis")!)).toEqual([]);
  });
});
