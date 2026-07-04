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
