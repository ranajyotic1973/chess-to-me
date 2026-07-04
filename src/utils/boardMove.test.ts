import { Chess } from "chess.js";
import { matchMoveAgainstLine } from "./boardMove";
import type { AnalysisEntry } from "../types";

// Minimal AnalysisEntry factory — only `moves` matters for matching.
function entry(moves: Array<{ from: string; to: string }>): AnalysisEntry {
  return {
    id: "x",
    rank: 1,
    rawText: "",
    cleanText: "",
    moves: moves as any,
    scoreLabel: null,
    description: "",
    uciDescription: "",
    llmUserMessage: "",
  };
}

// FEN after 1.e4 from the standard start position.
function fenAfter(moves: Array<{ from: string; to: string }>): string {
  const chess = new Chess();
  for (const m of moves) chess.move({ from: m.from, to: m.to, promotion: "q" });
  return chess.fen();
}

describe("matchMoveAgainstLine", () => {
  it("returns shouldRunAnalysis when no line is selected", () => {
    const res = matchMoveAgainstLine(fenAfter([{ from: "e2", to: "e4" }]), null, [], 0, "start");
    expect(res.matched).toBe(false);
    expect(res.shouldRunAnalysis).toBe(true);
  });

  it("returns shouldRunAnalysis when the selected entry is missing", () => {
    const res = matchMoveAgainstLine("somefen", 2, [entry([{ from: "e2", to: "e4" }])], 0, "start");
    expect(res.matched).toBe(false);
    expect(res.shouldRunAnalysis).toBe(true);
  });

  it("matches when the user's move follows the line", () => {
    const line = entry([{ from: "e2", to: "e4" }, { from: "e7", to: "e5" }]);
    const userFen = fenAfter([{ from: "e2", to: "e4" }]);
    const res = matchMoveAgainstLine(userFen, 0, [line], 0, "start");
    expect(res.matched).toBe(true);
    expect(res.shouldRunAnalysis).toBe(false);
    expect(res.newMoveIndex).toBe(1);
    expect(res.matchedLineIndex).toBe(0);
  });

  it("does not match when the user deviates from the line", () => {
    const line = entry([{ from: "e2", to: "e4" }]);
    const userFen = fenAfter([{ from: "d2", to: "d4" }]);
    const res = matchMoveAgainstLine(userFen, 0, [line], 0, "start");
    expect(res.matched).toBe(false);
    expect(res.shouldRunAnalysis).toBe(true);
  });

  it("flags analysis when the line is already exhausted", () => {
    const line = entry([{ from: "e2", to: "e4" }]);
    const res = matchMoveAgainstLine("anything", 0, [line], 1, "start");
    expect(res.matched).toBe(false);
    expect(res.shouldRunAnalysis).toBe(true);
  });

  it("matches a move from a non-start currentFen", () => {
    const afterE4 = fenAfter([{ from: "e2", to: "e4" }]);
    // Line's next move (index 0 relative to afterE4) is e7e5.
    const line = entry([{ from: "e7", to: "e5" }]);
    const userFen = fenAfter([{ from: "e2", to: "e4" }, { from: "e7", to: "e5" }]);
    const res = matchMoveAgainstLine(userFen, 0, [line], 0, afterE4);
    expect(res.matched).toBe(true);
    expect(res.newMoveIndex).toBe(1);
  });
});
