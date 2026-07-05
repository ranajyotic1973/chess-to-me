import { resolveMode, MIDDLEGAME_MIN_PLIES } from "./modeRouting";

describe("resolveMode — middlegame ply gate", () => {
  it("downgrades MIDDLEGAME_ANALYSIS to ANALYSIS before 20 plies", () => {
    expect(resolveMode("MIDDLEGAME_ANALYSIS", 0)).toBe("ANALYSIS");
    expect(resolveMode("MIDDLEGAME_ANALYSIS", 19)).toBe("ANALYSIS");
  });

  it("allows MIDDLEGAME_ANALYSIS at or after 20 plies", () => {
    expect(resolveMode("MIDDLEGAME_ANALYSIS", MIDDLEGAME_MIN_PLIES)).toBe("MIDDLEGAME_ANALYSIS");
    expect(resolveMode("MIDDLEGAME_ANALYSIS", 40)).toBe("MIDDLEGAME_ANALYSIS");
  });

  it("never gates other categories on ply count", () => {
    expect(resolveMode("OPENING_TRAINING", 0)).toBe("OPENING_TRAINING");
    expect(resolveMode("ENDGAME_TRAINING", 2)).toBe("ENDGAME_TRAINING");
    expect(resolveMode("ANALYSIS", 0)).toBe("ANALYSIS");
    expect(resolveMode("PUZZLE", 50)).toBe("PUZZLE");
  });

  it("normalizes case and missing ply counts", () => {
    expect(resolveMode("middlegame_analysis", 25)).toBe("MIDDLEGAME_ANALYSIS");
    expect(resolveMode("MIDDLEGAME_ANALYSIS", NaN)).toBe("ANALYSIS");
  });
});
