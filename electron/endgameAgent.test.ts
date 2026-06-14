import { handleEndgameRequest } from "./endgameAgent";

const VALID_ENDGAME_JSON = JSON.stringify({
  response_type: "Endgame",
  title: "King and Pawn Endgame",
  fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
  moves: [
    { uci: "e1e2", san: "Ke2", commentary: "The king marches forward to support the pawn!" },
    { uci: "e8d7", san: "Kd7", commentary: "The black king tries to stop the pawn." },
    { uci: "e2e3", san: "Ke3", commentary: "White keeps advancing. This is called opposition!" },
    { uci: "d7e7", san: "Ke7", commentary: "Black king guards the queening square." },
    { uci: "e2e4", san: "e4",  commentary: "The pawn marches!" }
  ],
  story: "This endgame technique has been known for over 200 years.",
  explanation: "Let's learn how to win a King and Pawn endgame!"
});

const mockRunLlm = jest.fn().mockResolvedValue(VALID_ENDGAME_JSON);

describe("handleEndgameRequest", () => {
  beforeEach(() => {
    mockRunLlm.mockClear();
  });

  test("returns valid endgame response with moves array", async () => {
    const result = await handleEndgameRequest("Show me a King and Pawn endgame", [], mockRunLlm);
    expect(result.ok).toBe(true);
    expect(result.answer).toBeDefined();
    const parsed = JSON.parse(result.answer!);
    expect(parsed.response_type).toBe("Endgame");
    expect(parsed.fen).toBeTruthy();
    expect(Array.isArray(parsed.moves)).toBe(true);
  });

  test("rejects invalid FEN — returns error payload", async () => {
    const badFenJson = JSON.stringify({
      response_type: "Endgame",
      title: "Bad Position",
      fen: "NOT_A_VALID_FEN",
      moves: [],
      story: "",
      explanation: ""
    });
    mockRunLlm.mockResolvedValueOnce(badFenJson);
    const result = await handleEndgameRequest("Give me an endgame", [], mockRunLlm);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid endgame position/i);
  });

  test("skips invalid UCI moves", async () => {
    const mixedMovesJson = JSON.stringify({
      response_type: "Endgame",
      title: "King and Pawn",
      fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
      moves: [
        { uci: "e1e2", san: "Ke2", commentary: "Good king move." },
        { uci: "INVALID", san: "???", commentary: "Bad move." },
        { uci: "e8d7", san: "Kd7", commentary: "Black king responds." }
      ],
      story: "",
      explanation: ""
    });
    mockRunLlm.mockResolvedValueOnce(mixedMovesJson);
    const result = await handleEndgameRequest("Show me endgame", [], mockRunLlm);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.moves.every((m: { uci: string }) => m.uci !== "INVALID")).toBe(true);
  });

  test("returns error when response_type is not Endgame", async () => {
    mockRunLlm.mockResolvedValueOnce(JSON.stringify({ response_type: "Analysis", answer: "Hello" }));
    const result = await handleEndgameRequest("Practice endgame", [], mockRunLlm);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("system prompt includes endgame vocabulary keywords", async () => {
    // Verify the system prompt contains expected chess vocabulary
    const capturedMessages: Array<{ role: string; content: string }> = [];
    const captureLlm = jest.fn().mockImplementation(async ({ messages }) => {
      capturedMessages.push(...messages);
      return VALID_ENDGAME_JSON;
    });
    await handleEndgameRequest("Teach me endgame", [], captureLlm);
    const systemMsg = capturedMessages.find(m => m.role === "system");
    expect(systemMsg?.content).toMatch(/opposition/i);
    expect(systemMsg?.content).toMatch(/zugzwang/i);
    expect(systemMsg?.content).toMatch(/key square/i);
  });
});
