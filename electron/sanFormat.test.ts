import { sanLineWithGlyphs } from "./sanFormat";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("sanLineWithGlyphs", () => {
  test("converts a UCI line from the starting position into numbered glyphed SAN", () => {
    expect(sanLineWithGlyphs("e2e4 e7e5 g1f3 b8c6 f1b5", START_FEN)).toBe(
      "1. e4 e5 2. ♘f3 ♞c6 3. ♗b5"
    );
  });

  test("handles a line starting with Black to move", () => {
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    expect(sanLineWithGlyphs("c7c5 g1f3", afterE4)).toBe("1… c5 2. ♘f3");
  });

  test("falls back to the original input when no moves parse", () => {
    expect(sanLineWithGlyphs("not a move", START_FEN)).toBe("not a move");
  });

  test("returns the original input for an empty line", () => {
    expect(sanLineWithGlyphs("", START_FEN)).toBe("");
  });

  test("recovers gracefully from an invalid starting FEN", () => {
    expect(sanLineWithGlyphs("e2e4", "not-a-fen")).toBe("1. e4");
  });
});
