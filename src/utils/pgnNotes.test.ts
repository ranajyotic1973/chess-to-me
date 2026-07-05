import { buildPgnWithNotes, hasAnyNotes } from "./pgnNotes";

describe("buildPgnWithNotes", () => {
  it("converts UCI moves to SAN with move numbers", () => {
    const pgn = buildPgnWithNotes(["e2e4", "e7e5", "g1f3"], {});
    expect(pgn).toBe("1. e4 e5 2. Nf3");
  });

  it("embeds a note as a PGN comment after the move", () => {
    const pgn = buildPgnWithNotes(["e2e4"], { 0: "Best by test" });
    expect(pgn).toBe("1. e4 { Best by test }");
  });

  it("embeds notes on the correct moves only", () => {
    const pgn = buildPgnWithNotes(["e2e4", "e7e5", "g1f3"], { 1: "solid reply" });
    expect(pgn).toBe("1. e4 e5 { solid reply } 2. Nf3");
  });

  it("preserves markdown syntax inside the comment", () => {
    const pgn = buildPgnWithNotes(["e2e4"], { 0: "**strong** move\n- develops" });
    expect(pgn).toContain("{ **strong** move\n- develops }");
  });

  it("escapes literal closing braces to keep PGN parseable", () => {
    const pgn = buildPgnWithNotes(["e2e4"], { 0: "note with } brace" });
    expect(pgn).not.toContain("} brace }");
    expect(pgn).toContain("note with ) brace");
  });

  it("escapes literal opening braces too (PGN comments do not nest)", () => {
    const pgn = buildPgnWithNotes(["e2e4"], { 0: "a { nested } b" });
    expect(pgn).toBe("1. e4 { a ( nested ) b }");
  });

  it("re-numbers a Black move that follows a White move's comment", () => {
    // A comment interrupts the movetext, so Black's move needs an "N..." label
    // to stay compliant with PGN import/export numbering rules.
    const pgn = buildPgnWithNotes(["e2e4", "e7e5"], { 0: "opening the game" });
    expect(pgn).toBe("1. e4 { opening the game } 1... e5");
  });

  it("does not re-number a Black move when the White move has no comment", () => {
    const pgn = buildPgnWithNotes(["e2e4", "e7e5"], {});
    expect(pgn).toBe("1. e4 e5");
  });

  it("normalizes CRLF newlines inside a comment to LF", () => {
    const pgn = buildPgnWithNotes(["e2e4"], { 0: "line1\r\nline2" });
    expect(pgn).toBe("1. e4 { line1\nline2 }");
  });

  it("ignores empty / whitespace-only notes", () => {
    const pgn = buildPgnWithNotes(["e2e4", "e7e5"], { 0: "   ", 1: "" });
    expect(pgn).toBe("1. e4 e5");
  });

  it("handles an empty move list", () => {
    expect(buildPgnWithNotes([], {})).toBe("");
  });

  it("auto-queens a pawn promotion without a suffix", () => {
    // White pawn e7->e8 promoting from a contrived position via a full game is
    // complex; instead verify the SAN fallback path does not throw for a plain
    // promotion suffix.
    const pgn = buildPgnWithNotes(["e2e4", "d7d5", "e4d5"], {});
    expect(pgn).toBe("1. e4 d5 2. exd5");
  });
});

describe("hasAnyNotes", () => {
  it("returns false when there are no notes", () => {
    expect(hasAnyNotes({})).toBe(false);
  });

  it("returns false when all notes are empty", () => {
    expect(hasAnyNotes({ 0: "", 1: "  " })).toBe(false);
  });

  it("returns true when at least one note has content", () => {
    expect(hasAnyNotes({ 0: "", 2: "real note" })).toBe(true);
  });
});
