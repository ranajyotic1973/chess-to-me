import { parseStockfishLine, deriveFenSequence, parseFenOrPgnInput, sanWithGlyph } from "./analysisHelpers";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

// ---------------------------------------------------------------------------
// sanWithGlyph
// ---------------------------------------------------------------------------
describe("sanWithGlyph", () => {
  test("replaces white piece letter with white glyph", () => {
    expect(sanWithGlyph("Nf3", false)).toBe("♘f3");
  });

  test("replaces black piece letter with black glyph", () => {
    expect(sanWithGlyph("Nf6", true)).toBe("♞f6");
  });

  test("leaves pawn moves unchanged (no leading piece letter)", () => {
    expect(sanWithGlyph("e4", false)).toBe("e4");
  });

  test("leaves castling notation unchanged", () => {
    expect(sanWithGlyph("O-O", false)).toBe("O-O");
  });
});

// ---------------------------------------------------------------------------
// parseStockfishLine
// ---------------------------------------------------------------------------
describe("parseStockfishLine", () => {
  test("parses a line with pv string containing coordinate pairs", () => {
    const line = {
      rank: 1,
      score: { type: "cp" as const, value: 35 },
      pv: "e2e4 d7d5 e4d5"
    };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.rank).toBe(1);
    expect(entry.moves.length).toBeGreaterThan(0);
    expect(entry.moves[0]).toEqual({ from: "e2", to: "e4" });
    expect(entry.scoreLabel).toBe("CP 35");
  });

  test("uses fallbackRank when rank not in line", () => {
    const line = { score: null, pv: "d2d4" };
    const entry = parseStockfishLine(line, 3, START_FEN);
    expect(entry.rank).toBe(3);
  });

  test("generates fallback id from rank", () => {
    const line = { score: null, pv: "e2e4" };
    const entry = parseStockfishLine(line, 2, START_FEN);
    expect(entry.id).toBe("stockfish-line-2");
  });

  test("preserves provided id", () => {
    const line = { id: "custom-id-1", score: null, pv: "e2e4", rank: 1 };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.id).toBe("custom-id-1");
  });

  test("formats scoreLabel for mate score", () => {
    const line = {
      rank: 1,
      score: { type: "mate" as const, value: 3 },
      pv: "e2e4"
    };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.scoreLabel).toBe("Mate 3");
  });

  test("scoreLabel is null when score is null", () => {
    const line = { rank: 1, score: null, pv: "e2e4" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.scoreLabel).toBeNull();
  });

  test("handles line field instead of pv", () => {
    const line = { rank: 1, score: null, line: "e2e4 d7d5" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.moves.length).toBeGreaterThan(0);
  });

  test("handles empty pv gracefully", () => {
    const line = { rank: 1, score: null, pv: "" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.rawText).toBe("No data");
    expect(entry.moves).toEqual([]);
  });

  test("handles win-probability score (no scoreLabel)", () => {
    const line = {
      rank: 1,
      score: { winProb: 0.75 } as any,
      pv: "e2e4"
    };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.scoreLabel).toBeNull();
  });

  test("includes llmUserMessage with FEN and moves", () => {
    const line = { rank: 1, score: null, pv: "e2e4 d7d5" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    expect(entry.llmUserMessage).toContain("Position FEN:");
    expect(entry.llmUserMessage).toContain("Moves:");
  });

  test("uses 'start' as default startingFen", () => {
    const line = { rank: 1, score: null, pv: "e2e4" };
    const entry = parseStockfishLine(line, 1);
    expect(entry.llmUserMessage).toContain("start");
  });

  test("description formats pawn moves with move numbers", () => {
    const line = { rank: 1, score: null, pv: "e2e4 d7d5" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    // Pawns have no piece letter in SAN; expect "1. e4 d5"
    expect(entry.description).toBe("1. e4 d5");
  });

  test("description formats knight moves with piece glyphs", () => {
    const line = { rank: 1, score: null, pv: "g1f3 b8c6" };
    const entry = parseStockfishLine(line, 1, START_FEN);
    // White knight ♘, black knight ♞
    expect(entry.description).toBe("1. ♘f3 ♞c6");
  });

  test("description handles black-to-move opening with ellipsis", () => {
    // After 1. e4 (black to move)
    const line = { rank: 1, score: null, pv: "b8c6" };
    const entry = parseStockfishLine(line, 1, AFTER_E4_FEN);
    expect(entry.description).toBe("1… ♞c6");
  });
});

// ---------------------------------------------------------------------------
// deriveFenSequence
// ---------------------------------------------------------------------------
describe("deriveFenSequence", () => {
  test("returns starting FEN as first element with no moves", () => {
    const seq = deriveFenSequence([], START_FEN);
    expect(seq).toHaveLength(1);
    expect(seq[0]).toBe(START_FEN);
  });

  test("returns sequence with one FEN per move applied", () => {
    const moves = [{ from: "e2", to: "e4" }];
    const seq = deriveFenSequence(moves, START_FEN);
    expect(seq).toHaveLength(2);
    expect(seq[0]).toBe(START_FEN);
    expect(seq[1]).toContain("PPPP1PPP"); // e-pawn moved
  });

  test("handles 'start' as startingFen", () => {
    const seq = deriveFenSequence([{ from: "e2", to: "e4" }], "start");
    expect(seq.length).toBe(2);
  });

  test("stops sequence on illegal move", () => {
    const moves = [
      { from: "e2", to: "e4" },
      { from: "a1", to: "a8" } // illegal
    ];
    const seq = deriveFenSequence(moves, START_FEN);
    expect(seq.length).toBe(2); // stopped after first legal move
  });

  test("handles invalid starting FEN by resetting to start", () => {
    const moves = [{ from: "e2", to: "e4" }];
    const seq = deriveFenSequence(moves, "not-a-valid-fen");
    expect(seq.length).toBeGreaterThan(0);
  });

  test("handles empty moves array with 'start' fen", () => {
    const seq = deriveFenSequence([], "start");
    expect(seq.length).toBe(1);
    expect(seq[0]).toContain("PPPPPPPP"); // starting position
  });

  test("produces correct multi-move sequence", () => {
    const moves = [
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
      { from: "g1", to: "f3" }
    ];
    const seq = deriveFenSequence(moves, START_FEN);
    expect(seq).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// parseFenOrPgnInput
// ---------------------------------------------------------------------------
describe("parseFenOrPgnInput", () => {
  test("returns error for empty string", () => {
    const result = parseFenOrPgnInput("");
    expect(result).toHaveProperty("error");
  });

  test("returns error for whitespace-only string", () => {
    const result = parseFenOrPgnInput("   ");
    expect(result).toHaveProperty("error");
  });

  test("parses a valid FEN string", () => {
    const result = parseFenOrPgnInput(AFTER_E4_FEN);
    expect(result).toHaveProperty("positions");
    expect((result as any).positions).toHaveLength(1);
    expect((result as any).positions[0]).toBe(AFTER_E4_FEN);
  });

  test("parses a valid PGN string", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6";
    const result = parseFenOrPgnInput(pgn);
    expect(result).toHaveProperty("positions");
    expect((result as any).positions.length).toBeGreaterThan(1);
  });

  test("returns error for invalid FEN that is not PGN", () => {
    const result = parseFenOrPgnInput("not/a/valid/fen/at/all invalid");
    expect(result).toHaveProperty("error");
  });

  test("returns error for garbage input", () => {
    const result = parseFenOrPgnInput("xyzxyz");
    expect(result).toHaveProperty("error");
  });

  test("PGN positions include starting position", () => {
    const pgn = "1. e4";
    const result = parseFenOrPgnInput(pgn) as { positions: string[] };
    expect(result.positions).toHaveLength(2); // start + after e4
  });
});
