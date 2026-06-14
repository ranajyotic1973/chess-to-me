// Tests for ecoLookup helpers.
// The @chess-openings/eco.json package is ESM-only; Jest uses the CJS stub in
// __mocks__/chess-eco.js (mapped by jest.config.js moduleNameMapper).

const RUY_LOPEZ_FEN = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
// chess.js v1+ only includes the en passant square when capture is actually possible,
// so after 1.e4 c5 (no white pawn on b5/d5) the ep field is "-", not "c6".
const SICILIAN_FEN = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const FAKE_BOOK: Record<string, { eco: string; name: string; src: string; moves: string }> = {
  [RUY_LOPEZ_FEN]: { eco: "C60", name: "Ruy Lopez", src: "eco_tsv", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5" },
  [SICILIAN_FEN]:  { eco: "B20", name: "Sicilian Defense", src: "eco_tsv", moves: "1. e4 c5" }
};

// Get stub BEFORE importing ecoLookup so we can configure it before initEcoLookup runs
const ecoStub = require("../__mocks__/chess-eco") as {
  openingBook: jest.Mock;
  findOpening: jest.Mock;
  getPositionBook: jest.Mock;
};

// Configure stub with FAKE_BOOK before the module is initialised
ecoStub.openingBook.mockResolvedValue(FAKE_BOOK);
ecoStub.findOpening.mockImplementation((_book: Record<string, any>, fen: string) => _book[fen] ?? undefined);
ecoStub.getPositionBook.mockReturnValue({});

import { initEcoLookup, lookupOpeningByFen, lookupOpeningByMoves, isEcoAvailable } from "./ecoLookup";

describe("ecoLookup", () => {
  beforeAll(async () => {
    await initEcoLookup();
  });

  test("library loads successfully", () => {
    expect(isEcoAvailable()).toBe(true);
  });

  test("lookupOpeningByFen returns match for known position", () => {
    const result = lookupOpeningByFen(RUY_LOPEZ_FEN);
    expect(result).not.toBeNull();
    expect(result?.eco).toBe("C60");
    expect(result?.name).toBe("Ruy Lopez");
  });

  test("lookupOpeningByFen returns null for unknown position", () => {
    const result = lookupOpeningByFen("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result).toBeNull();
  });

  test("lookupOpeningByMoves returns last known opening in move sequence", () => {
    // 1.e4 c5 → Sicilian Defense
    const result = lookupOpeningByMoves(["e2e4", "c7c5"]);
    expect(result).not.toBeNull();
    expect(result?.eco).toBe("B20");
    expect(result?.name).toBe("Sicilian Defense");
  });

  test("lookupOpeningByMoves returns null for empty moves array", () => {
    expect(lookupOpeningByMoves([])).toBeNull();
  });

  test("lookupOpeningByMoves handles invalid UCI move gracefully", () => {
    expect(() => lookupOpeningByMoves(["e2e4", "INVALID"])).not.toThrow();
  });

  test("lookupOpeningByFen returns null for unrecognised FEN", () => {
    expect(lookupOpeningByFen("UNKNOWN_FEN")).toBeNull();
  });
});
