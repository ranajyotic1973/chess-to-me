import { handleOpeningRequest } from "./openingAgent";

jest.mock("./ecoLookup", () => ({
  lookupOpeningByMoves: jest.fn().mockReturnValue({ eco: "C60", name: "Ruy Lopez" }),
  lookupOpeningByFen: jest.fn().mockReturnValue(null),
  isEcoAvailable: jest.fn().mockReturnValue(true)
}));

const VALID_OPENING_JSON = JSON.stringify({
  response_type: "Opening",
  opening_name: "Ruy Lopez",
  eco_code: "C60",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moves: [
    { uci: "e2e4", san: "e4", commentary: "White takes the center!" },
    { uci: "e7e5", san: "e5", commentary: "Black fights back in the center!" },
    { uci: "g1f3", san: "Nf3", commentary: "The knight develops and attacks." },
    { uci: "b8c6", san: "Nc6", commentary: "Black defends the e5 pawn." },
    { uci: "f1b5", san: "Bb5", commentary: "This is the Ruy Lopez move!" }
  ],
  story: "Magnus Carlsen used this in the 2013 World Chess Championship.",
  explanation: "Let's learn the Ruy Lopez, one of the oldest openings!"
});

const mockRunLlm = jest.fn().mockResolvedValue(VALID_OPENING_JSON);

describe("handleOpeningRequest", () => {
  beforeEach(() => {
    mockRunLlm.mockClear();
  });

  test("returns valid opening response with moves array", async () => {
    const result = await handleOpeningRequest("Teach me the Ruy Lopez", [], mockRunLlm);
    expect(result.ok).toBe(true);
    expect(result.answer).toBeDefined();
    const parsed = JSON.parse(result.answer!);
    expect(parsed.response_type).toBe("Opening");
    expect(Array.isArray(parsed.moves)).toBe(true);
    expect(parsed.moves.length).toBe(5);
  });

  test("validates UCI moves with chess.js — skips illegal moves", async () => {
    const badMovesJson = JSON.stringify({
      response_type: "Opening",
      opening_name: "Test",
      eco_code: "A00",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: [
        { uci: "e2e4", san: "e4", commentary: "Good move." },
        { uci: "INVALID", san: "???", commentary: "Bad move." },
        { uci: "e7e5", san: "e5", commentary: "Black responds." }
      ],
      story: "",
      explanation: ""
    });
    mockRunLlm.mockResolvedValueOnce(badMovesJson);
    const result = await handleOpeningRequest("Test opening", [], mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    // Only e2e4 and e7e5 are valid — INVALID should be skipped
    expect(parsed.moves.every((m: { uci: string }) => m.uci !== "INVALID")).toBe(true);
  });

  test("returns error when LLM returns non-Opening response_type", async () => {
    mockRunLlm.mockResolvedValueOnce(JSON.stringify({ response_type: "Analysis", answer: "Hello" }));
    const result = await handleOpeningRequest("Teach me an opening", [], mockRunLlm);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("uses ECO library to enrich eco_code from validated moves", async () => {
    const { lookupOpeningByMoves } = jest.requireMock("./ecoLookup") as { lookupOpeningByMoves: jest.Mock };
    lookupOpeningByMoves.mockReturnValue({ eco: "C65", name: "Ruy Lopez: Berlin Defense" });
    const result = await handleOpeningRequest("Teach me the Ruy Lopez Berlin", [], mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.eco_code).toBe("C65");
    expect(parsed.opening_name).toBe("Ruy Lopez: Berlin Defense");
  });

  test("degrades gracefully when ECO lookup returns null", async () => {
    const { lookupOpeningByMoves } = jest.requireMock("./ecoLookup") as { lookupOpeningByMoves: jest.Mock };
    lookupOpeningByMoves.mockReturnValue(null);
    const result = await handleOpeningRequest("Teach me an opening", [], mockRunLlm);
    expect(result.ok).toBe(true);
    // Falls back to whatever the LLM returned
    const parsed = JSON.parse(result.answer!);
    expect(parsed.opening_name).toBeTruthy();
  });
});
