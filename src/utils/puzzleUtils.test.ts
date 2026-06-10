import {
  looksLikeMoveSequence,
  normalizeSolutionMove,
  comparePuzzleAttempt,
  makeExplanationCacheKey,
  isSingleLineNumber,
  shouldSkipKeyboardNavigation
} from "./puzzleUtils";

// ---------------------------------------------------------------------------
// looksLikeMoveSequence — task 13.4
// ---------------------------------------------------------------------------
describe("looksLikeMoveSequence", () => {
  test("returns true for single UCI move", () => {
    expect(looksLikeMoveSequence("e2e4")).toBe(true);
  });

  test("returns true for multiple UCI moves separated by spaces", () => {
    expect(looksLikeMoveSequence("e2e4 d7d5 e4e5")).toBe(true);
  });

  test("returns true for promotion move (five chars)", () => {
    expect(looksLikeMoveSequence("e7e8q")).toBe(true);
  });

  test("returns false when text contains a question mark", () => {
    expect(looksLikeMoveSequence("e2e4?")).toBe(false);
  });

  test("returns false when text contains a question word", () => {
    expect(looksLikeMoveSequence("what should I play")).toBe(false);
    expect(looksLikeMoveSequence("how does e2e4 work")).toBe(false);
    expect(looksLikeMoveSequence("explain e2e4")).toBe(false);
    expect(looksLikeMoveSequence("analyze this position")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(looksLikeMoveSequence("")).toBe(false);
  });

  test("returns false for plain text with no moves", () => {
    expect(looksLikeMoveSequence("king side castle")).toBe(false);
  });

  test("returns false when one token is not a UCI move", () => {
    expect(looksLikeMoveSequence("e2e4 x2x3")).toBe(false);
  });

  test("is case-insensitive (uppercase squares accepted)", () => {
    expect(looksLikeMoveSequence("E2E4 D7D5")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeSolutionMove — used by comparePuzzleAttempt
// ---------------------------------------------------------------------------
describe("normalizeSolutionMove", () => {
  test("lowercases and truncates promotion to 4 chars", () => {
    expect(normalizeSolutionMove("E7E8Q")).toBe("e7e8");
  });

  test("leaves 4-char move unchanged (lowercased)", () => {
    expect(normalizeSolutionMove("E2E4")).toBe("e2e4");
  });

  test("does not truncate moves shorter than 4 chars (edge case)", () => {
    expect(normalizeSolutionMove("e2e")).toBe("e2e");
  });
});

// ---------------------------------------------------------------------------
// comparePuzzleAttempt — tasks 13.2 and 13.3
// ---------------------------------------------------------------------------
describe("comparePuzzleAttempt", () => {
  const solution = ["e2e4", "d7d5", "e4e5"];

  test("returns true when attempt exactly matches solution (task 13.2)", () => {
    expect(comparePuzzleAttempt(["e2e4", "d7d5", "e4e5"], solution)).toBe(true);
  });

  test("returns true when attempt uses uppercase (normalized)", () => {
    expect(comparePuzzleAttempt(["E2E4", "D7D5", "E4E5"], solution)).toBe(true);
  });

  test("returns true when solution contains promotion and attempt matches base 4 chars", () => {
    const sol = ["e7e8q"];
    expect(comparePuzzleAttempt(["e7e8"], sol)).toBe(true);
  });

  test("returns false when first move is wrong (task 13.3 — immediate detection)", () => {
    expect(comparePuzzleAttempt(["d2d4", "d7d5", "e4e5"], solution)).toBe(false);
  });

  test("returns false when middle move is wrong", () => {
    expect(comparePuzzleAttempt(["e2e4", "c7c5", "e4e5"], solution)).toBe(false);
  });

  test("returns false when attempt is too short", () => {
    expect(comparePuzzleAttempt(["e2e4"], solution)).toBe(false);
  });

  test("returns false when attempt is too long", () => {
    expect(comparePuzzleAttempt(["e2e4", "d7d5", "e4e5", "f7f6"], solution)).toBe(false);
  });

  test("returns true for empty arrays (no moves to compare)", () => {
    expect(comparePuzzleAttempt([], [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Per-move immediate detection helper (simulates task 13.3 logic)
// The App.tsx handleMoveAttempt does: normalizeSolutionMove(from+to) !== normalizeSolutionMove(solution[idx])
// ---------------------------------------------------------------------------
describe("per-move immediate comparison (task 13.3)", () => {
  test("detects wrong move at index 0 immediately", () => {
    const solution = ["e2e4", "d7d5"];
    const from = "d2";
    const to = "d4";
    const attemptedMove = from + to; // "d2d4"
    expect(normalizeSolutionMove(attemptedMove)).not.toBe(normalizeSolutionMove(solution[0]));
  });

  test("allows correct move at index 0", () => {
    const solution = ["e2e4", "d7d5"];
    const from = "e2";
    const to = "e4";
    const attemptedMove = from + to;
    expect(normalizeSolutionMove(attemptedMove)).toBe(normalizeSolutionMove(solution[0]));
  });
});

// ---------------------------------------------------------------------------
// makeExplanationCacheKey — tasks 13.7 and 13.8
// ---------------------------------------------------------------------------
describe("makeExplanationCacheKey", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

  test("produces colon-delimited key of fen:lineIndex:moveIndex", () => {
    const key = makeExplanationCacheKey(fen, 0, 0);
    expect(key).toBe(`${fen}:0:0`);
  });

  test("different lineIndex produces different key", () => {
    expect(makeExplanationCacheKey(fen, 0, 0)).not.toBe(makeExplanationCacheKey(fen, 1, 0));
  });

  test("different moveIndex produces different key", () => {
    expect(makeExplanationCacheKey(fen, 0, 0)).not.toBe(makeExplanationCacheKey(fen, 0, 1));
  });

  test("cache round-trip: store and retrieve via Map (task 13.8 — instant cached retrieval)", () => {
    const cache = new Map<string, string>();
    const key = makeExplanationCacheKey(fen, 1, 2);
    const explanation = "This move develops the knight to a strong outpost.";

    cache.set(key, explanation);

    // Simulate backward navigation — retrieve from cache without LLM call
    const cached = cache.get(makeExplanationCacheKey(fen, 1, 2));
    expect(cached).toBe(explanation);
  });

  test("cache miss returns undefined when key was never stored (task 13.7 — triggers LLM)", () => {
    const cache = new Map<string, string>();
    const key = makeExplanationCacheKey(fen, 0, 5);
    expect(cache.get(key)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isSingleLineNumber — task 13.6
// ---------------------------------------------------------------------------
describe("isSingleLineNumber", () => {
  test("returns line number when input is valid digit within range", () => {
    expect(isSingleLineNumber("2", 4)).toBe(2);
    expect(isSingleLineNumber("1", 4)).toBe(1);
    expect(isSingleLineNumber("4", 4)).toBe(4);
  });

  test("returns null when digit exceeds maxLines (task 13.6 — no LLM if out of range)", () => {
    expect(isSingleLineNumber("5", 4)).toBeNull();
  });

  test("returns null for multi-digit numbers", () => {
    expect(isSingleLineNumber("10", 4)).toBeNull();
  });

  test("returns null for zero", () => {
    expect(isSingleLineNumber("0", 4)).toBeNull();
  });

  test("returns null for non-numeric text", () => {
    expect(isSingleLineNumber("e2e4", 4)).toBeNull();
    expect(isSingleLineNumber("line 2", 4)).toBeNull();
  });

  test("returns null for whitespace-only input", () => {
    expect(isSingleLineNumber("   ", 4)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldSkipKeyboardNavigation — task 13.9
// ---------------------------------------------------------------------------
describe("shouldSkipKeyboardNavigation", () => {
  test("returns true when active element is TEXTAREA (task 13.9 — board should NOT advance)", () => {
    expect(shouldSkipKeyboardNavigation({ tagName: "TEXTAREA" } as Element)).toBe(true);
  });

  test("returns true when active element is INPUT", () => {
    expect(shouldSkipKeyboardNavigation({ tagName: "INPUT" } as Element)).toBe(true);
  });

  test("returns false when active element is a DIV (board advances normally)", () => {
    expect(shouldSkipKeyboardNavigation({ tagName: "DIV" } as Element)).toBe(false);
  });

  test("returns false when active element is BODY", () => {
    expect(shouldSkipKeyboardNavigation({ tagName: "BODY" } as Element)).toBe(false);
  });

  test("returns false when activeElement is null", () => {
    expect(shouldSkipKeyboardNavigation(null)).toBe(false);
  });
});
