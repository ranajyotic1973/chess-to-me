import { handleMiddlegameRequest } from "./middlegameAgent";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MIDDLEGAME_FEN = "r1bqk2r/pp2bppp/2n1pn2/3p4/3P1B2/2N1PN2/PP3PPP/R2QKB1R w KQkq - 0 8";

// Legal sequence from MIDDLEGAME_FEN: e3-e4, d5xe4, Nc3xe4
const VALID_MIDDLEGAME_JSON = JSON.stringify({
  response_type: "Middlegame",
  title: "Central Pawn Tension — Who Takes First?",
  fen: MIDDLEGAME_FEN,
  theme: "Pawn Structure",
  moves: [
    { uci: "e3e4", san: "e4", commentary: "White pushes to challenge the center and open lines for the pieces!" },
    { uci: "d5e4", san: "dxe4", commentary: "Black captures to relieve the tension and win a pawn." },
    { uci: "c3e4", san: "Nxe4", commentary: "White recaptures with the knight, gaining a strong outpost in the center!" }
  ],
  story: "Anatoly Karpov used central pawn tensions brilliantly in the 1970s.",
  explanation: "Let's explore central pawn tension — a key middlegame skill!"
});

const mockRunLlm = jest.fn().mockResolvedValue(VALID_MIDDLEGAME_JSON);

describe("handleMiddlegameRequest", () => {
  beforeEach(() => {
    mockRunLlm.mockClear();
    mockRunLlm.mockResolvedValue(VALID_MIDDLEGAME_JSON);
  });

  test("returns valid middlegame response with moves array", async () => {
    const result = await handleMiddlegameRequest("Explain the isolated pawn", [], MIDDLEGAME_FEN, mockRunLlm);
    expect(result.ok).toBe(true);
    expect(result.answer).toBeDefined();
    const parsed = JSON.parse(result.answer!);
    expect(parsed.response_type).toBe("Middlegame");
    expect(Array.isArray(parsed.moves)).toBe(true);
    expect(parsed.moves.length).toBeGreaterThan(0);
  });

  test("uses the provided current FEN as the starting position", async () => {
    const result = await handleMiddlegameRequest("What's the plan?", [], MIDDLEGAME_FEN, mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.fen).toBe(MIDDLEGAME_FEN);
  });

  test("falls back to LLM-provided FEN when no current FEN given", async () => {
    const result = await handleMiddlegameRequest("Teach me middlegame strategy", [], undefined, mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.fen).toBe(MIDDLEGAME_FEN);
  });

  test("validates UCI moves with chess.js — skips illegal moves", async () => {
    const badMovesJson = JSON.stringify({
      response_type: "Middlegame",
      title: "Test",
      fen: STARTING_FEN,
      theme: "Piece Activity",
      moves: [
        { uci: "e2e4", san: "e4", commentary: "Good move." },
        { uci: "INVALID", san: "???", commentary: "Bad move." },
        { uci: "e7e5", san: "e5", commentary: "Black responds." }
      ],
      story: "",
      explanation: ""
    });
    mockRunLlm.mockResolvedValueOnce(badMovesJson);
    const result = await handleMiddlegameRequest("Test", [], STARTING_FEN, mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.moves.every((m: { uci: string }) => m.uci !== "INVALID")).toBe(true);
  });

  test("returns error when LLM returns wrong response_type", async () => {
    mockRunLlm.mockResolvedValueOnce(JSON.stringify({ response_type: "Analysis", answer: "hello" }));
    const result = await handleMiddlegameRequest("Analyze position", [], undefined, mockRunLlm);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns error when FEN is invalid and no current FEN provided", async () => {
    const badFenJson = JSON.stringify({
      response_type: "Middlegame",
      title: "Test",
      fen: "not-a-fen",
      theme: "Plans",
      moves: [],
      story: "",
      explanation: ""
    });
    mockRunLlm.mockResolvedValueOnce(badFenJson);
    const result = await handleMiddlegameRequest("Test", [], undefined, mockRunLlm);
    expect(result.ok).toBe(false);
  });

  test("includes theme in the returned answer", async () => {
    const result = await handleMiddlegameRequest("Teach pawn structures", [], MIDDLEGAME_FEN, mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.theme).toBeTruthy();
  });
});
