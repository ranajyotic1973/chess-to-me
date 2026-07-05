import { buildLinePreview } from "./linePreview";

describe("buildLinePreview", () => {
  it("expands a legal line from the start position", () => {
    const p = buildLinePreview("start", "e2e4 e7e5 g1f3");
    expect(p.plies.map((m) => m.san)).toEqual(["e4", "e5", "Nf3"]);
    // fens = start + one per ply
    expect(p.fens).toHaveLength(4);
    expect(p.fens[0]).toContain("rnbqkbnr/pppppppp");
  });

  it("expands a line from an arbitrary mid-game FEN", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const p = buildLinePreview(fen, "g1f3 b8c6");
    expect(p.plies.map((m) => m.san)).toEqual(["Nf3", "Nc6"]);
    expect(p.fens).toHaveLength(3);
    expect(p.fens[0]).toBe(fen);
  });

  it("stops at the first illegal move but keeps the legal prefix", () => {
    const p = buildLinePreview("start", "e2e4 e7e5 e2e4");
    expect(p.plies.map((m) => m.san)).toEqual(["e4", "e5"]);
    expect(p.fens).toHaveLength(3);
  });

  it("returns just the start position for an empty pv", () => {
    const p = buildLinePreview("start", "");
    expect(p.plies).toHaveLength(0);
    expect(p.fens).toHaveLength(1);
  });

  it("handles a promotion move", () => {
    const p = buildLinePreview("8/P7/8/8/8/8/8/k6K w - - 0 1", "a7a8q");
    expect(p.plies[0].san).toContain("=Q");
    expect(p.fens).toHaveLength(2);
  });
});
