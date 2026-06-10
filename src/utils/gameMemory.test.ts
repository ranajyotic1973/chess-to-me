import {
  addGameToMemory,
  applyAnnotationsToPgn,
  parseAnnotationsFromResponse,
  formatAnnotationSymbol,
  deleteGameFromMemory,
  exportGameAsPgn,
  loadGameMemory,
  saveGameMemory,
  clearGameMemory
} from "./gameMemory";
import type { GameMemoryEntry } from "../types";

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

const SAMPLE_PGN = "1. e4 e5 2. Nf3 Nc6 3. Bb5";
const SAMPLE_ANNOTATIONS: Record<number, "!!" | "!" | "*" | "!?" | "??"> = { 1: "!!", 2: "!" };

// ---------------------------------------------------------------------------
// addGameToMemory
// ---------------------------------------------------------------------------
describe("addGameToMemory", () => {
  test("adds a new game to an empty list", () => {
    const result = addGameToMemory([], SAMPLE_PGN, SAMPLE_ANNOTATIONS);
    expect(result).toHaveLength(1);
    expect(result[0].pgn).toBe(SAMPLE_PGN);
    expect(result[0].annotations).toEqual(SAMPLE_ANNOTATIONS);
  });

  test("preserves existing games", () => {
    const existing: GameMemoryEntry[] = [{ pgn: "1. d4", annotations: {}, timestamp: 1 }];
    const result = addGameToMemory(existing, SAMPLE_PGN, {});
    expect(result).toHaveLength(2);
  });

  test("timestamp is a positive number", () => {
    const result = addGameToMemory([], SAMPLE_PGN, {});
    expect(result[0].timestamp).toBeGreaterThan(0);
  });

  test("accepts empty annotations", () => {
    const result = addGameToMemory([], SAMPLE_PGN, {});
    expect(result[0].annotations).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// applyAnnotationsToPgn
// ---------------------------------------------------------------------------
describe("applyAnnotationsToPgn", () => {
  test("returns original PGN when no annotations", () => {
    const result = applyAnnotationsToPgn(SAMPLE_PGN, {});
    expect(result).toBe(SAMPLE_PGN);
  });

  test("returns a string when annotations provided", () => {
    const result = applyAnnotationsToPgn(SAMPLE_PGN, SAMPLE_ANNOTATIONS);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parseAnnotationsFromResponse
// ---------------------------------------------------------------------------
describe("parseAnnotationsFromResponse", () => {
  test("returns empty object when no annotations field", () => {
    expect(parseAnnotationsFromResponse({})).toEqual({});
  });

  test("returns empty object when annotations is null", () => {
    expect(parseAnnotationsFromResponse({ annotations: null })).toEqual({});
  });

  test("parses valid annotation symbols", () => {
    const response = { annotations: { "1": "!!", "3": "!", "5": "*" } };
    const result = parseAnnotationsFromResponse(response);
    expect(result[1]).toBe("!!");
    expect(result[3]).toBe("!");
    expect(result[5]).toBe("*");
  });

  test("ignores invalid annotation symbols", () => {
    const response = { annotations: { "1": "invalid", "2": "!!" } };
    const result = parseAnnotationsFromResponse(response);
    expect(result[1]).toBeUndefined();
    expect(result[2]).toBe("!!");
  });

  test("parses all valid symbols: !!, !, *, !?, ??", () => {
    const response = { annotations: { "1": "!!", "2": "!", "3": "*", "4": "!?", "5": "??" } };
    const result = parseAnnotationsFromResponse(response);
    expect(Object.keys(result)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// formatAnnotationSymbol
// ---------------------------------------------------------------------------
describe("formatAnnotationSymbol", () => {
  test("formats !! as Brilliant Move", () => {
    expect(formatAnnotationSymbol("!!")).toContain("Brilliant");
  });

  test("formats ! as Excellent Move", () => {
    expect(formatAnnotationSymbol("!")).toContain("Excellent");
  });

  test("formats * as Best Move", () => {
    expect(formatAnnotationSymbol("*")).toContain("Best");
  });

  test("formats !? as Dubious Move", () => {
    expect(formatAnnotationSymbol("!?")).toContain("Dubious");
  });

  test("formats ?? as Blunder", () => {
    expect(formatAnnotationSymbol("??")).toContain("Blunder");
  });
});

// ---------------------------------------------------------------------------
// deleteGameFromMemory
// ---------------------------------------------------------------------------
describe("deleteGameFromMemory", () => {
  test("removes game by timestamp", () => {
    const games: GameMemoryEntry[] = [
      { pgn: "1. e4", annotations: {}, timestamp: 100 },
      { pgn: "1. d4", annotations: {}, timestamp: 200 }
    ];
    const result = deleteGameFromMemory(games, 100);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(200);
  });

  test("returns same array when timestamp not found", () => {
    const games: GameMemoryEntry[] = [{ pgn: "1. e4", annotations: {}, timestamp: 100 }];
    const result = deleteGameFromMemory(games, 999);
    expect(result).toHaveLength(1);
  });

  test("returns empty array when deleting last game", () => {
    const games: GameMemoryEntry[] = [{ pgn: "1. e4", annotations: {}, timestamp: 1 }];
    const result = deleteGameFromMemory(games, 1);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// exportGameAsPgn
// ---------------------------------------------------------------------------
describe("exportGameAsPgn", () => {
  test("includes PGN header and game moves", () => {
    const game: GameMemoryEntry = { pgn: SAMPLE_PGN, annotations: {}, timestamp: Date.now() };
    const result = exportGameAsPgn(game);
    expect(result).toContain('[Event "Chess-to-me Analysis"]');
    expect(result).toContain(SAMPLE_PGN);
  });

  test("includes date in header", () => {
    const ts = new Date("2025-01-15").getTime();
    const game: GameMemoryEntry = { pgn: "1. e4", annotations: {}, timestamp: ts };
    const result = exportGameAsPgn(game);
    expect(result).toContain("2025-01-15");
  });
});

// ---------------------------------------------------------------------------
// loadGameMemory / saveGameMemory / clearGameMemory
// ---------------------------------------------------------------------------
describe("loadGameMemory", () => {
  test("returns empty array when nothing stored", async () => {
    expect(await loadGameMemory()).toEqual([]);
  });

  test("returns stored games from localStorage", async () => {
    const games: GameMemoryEntry[] = [{ pgn: "1. e4", annotations: {}, timestamp: 1 }];
    localStorageMock.setItem("chess-to-me:game-memory", JSON.stringify(games));
    expect(await loadGameMemory()).toEqual(games);
  });
});

describe("saveGameMemory", () => {
  test("persists games to localStorage", async () => {
    const games: GameMemoryEntry[] = [{ pgn: "1. e4", annotations: {}, timestamp: 1 }];
    await saveGameMemory(games);
    const stored = localStorageMock.getItem("chess-to-me:game-memory");
    expect(JSON.parse(stored!)).toEqual(games);
  });
});

describe("clearGameMemory", () => {
  test("removes game memory from localStorage", async () => {
    localStorageMock.setItem("chess-to-me:game-memory", "[{}]");
    await clearGameMemory();
    expect(localStorageMock.getItem("chess-to-me:game-memory")).toBeNull();
  });
});
