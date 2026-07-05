import {
  handleEndgameRequest,
  selectEndgameLine,
  formatEndgameLines,
  formatEval,
  sideToMoveFromFen
} from "./endgameAgent";
import type { AnalysisLine } from "../src/types";

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

// ---------------------------------------------------------------------------
// Result-oriented endgame analysis (engine lines + evals → win, else best draw)
// ---------------------------------------------------------------------------

const line = (rank: number, pv: string, score: AnalysisLine["score"]): AnalysisLine => ({ rank, pv, score });

describe("formatEval", () => {
  test("formats centipawns, mate and win probability", () => {
    expect(formatEval({ type: "cp", value: 250 })).toBe("+2.5");
    expect(formatEval({ type: "cp", value: -120 })).toBe("-1.2");
    expect(formatEval({ type: "mate", value: 4 })).toBe("mate 4");
    expect(formatEval({ winProb: 0.78 })).toBe("78%");
    expect(formatEval(null)).toBe("?");
  });
});

describe("sideToMoveFromFen", () => {
  test("reads the side-to-move field, defaulting to white", () => {
    expect(sideToMoveFromFen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1")).toBe("white");
    expect(sideToMoveFromFen("4k3/8/8/8/8/8/4P3/4K3 b - - 0 1")).toBe("black");
    expect(sideToMoveFromFen(undefined)).toBe("white");
  });
});

describe("selectEndgameLine", () => {
  test("prefers the strongest winning line for white", () => {
    const lines = [
      line(1, "e1e2", { type: "cp", value: 30 }),   // draw-ish
      line(2, "e2e4", { type: "cp", value: 600 }),  // winning
      line(3, "e1d2", { type: "cp", value: 250 })
    ];
    const sel = selectEndgameLine(lines, "white");
    expect(sel?.index).toBe(1);
    expect(sel?.outcome).toBe("win");
  });

  test("prefers the strongest winning line for black (negative cp)", () => {
    const lines = [
      line(1, "e8e7", { type: "cp", value: -40 }),
      line(2, "a2a1q", { type: "mate", value: -3 }), // black mates
      line(3, "e8d7", { type: "cp", value: -500 })
    ];
    const sel = selectEndgameLine(lines, "black");
    expect(sel?.index).toBe(1);
    expect(sel?.outcome).toBe("win");
  });

  test("falls back to the best drawing line when no win exists", () => {
    const lines = [
      line(1, "e1e2", { type: "cp", value: -300 }), // losing
      line(2, "e2e3", { type: "cp", value: 10 }),   // draw — best available
      line(3, "e1d1", { type: "cp", value: -50 })
    ];
    const sel = selectEndgameLine(lines, "white");
    expect(sel?.index).toBe(1);
    expect(sel?.outcome).toBe("draw");
  });

  test("returns null with no lines", () => {
    expect(selectEndgameLine([], "white")).toBeNull();
  });
});

describe("handleEndgameRequest result-oriented mode", () => {
  const fen = "8/8/8/8/8/5k2/5p2/5K2 b - - 0 1";
  const engineLines: AnalysisLine[] = [
    line(1, "f2f1q", { type: "cp", value: -900 }),
    line(2, "f3g3", { type: "cp", value: -600 })
  ];

  test("prompt includes the engine lines with their evaluations", async () => {
    const captured: Array<{ role: string; content: string }> = [];
    const captureLlm = jest.fn().mockImplementation(async ({ messages }) => {
      captured.push(...messages);
      return JSON.stringify({
        response_type: "Endgame",
        title: "Winning with the pawn",
        fen,
        moves: [{ uci: "f3g3", san: "Kg3", commentary: "Black keeps the extra pawn." }],
        story: "",
        explanation: "Black is winning."
      });
    });

    await handleEndgameRequest("Who wins and how?", [], captureLlm, { fen, side: "black", lines: engineLines });
    const userMsg = captured.find(m => m.role === "user");
    expect(userMsg?.content).toContain("f2f1q");
    expect(userMsg?.content).toContain("-9.0");
    expect(userMsg?.content).toContain("Requested side: black");
    // result-oriented system prompt is used, not the generative one
    const systemMsg = captured.find(m => m.role === "system");
    expect(systemMsg?.content).toMatch(/from White's point of view/i);
  });

  test("keeps the caller's FEN even if the model echoes a different one", async () => {
    const badEchoLlm = jest.fn().mockResolvedValue(JSON.stringify({
      response_type: "Endgame",
      title: "x",
      fen: "totally-bogus-fen",
      moves: [],
      story: "",
      explanation: ""
    }));
    const result = await handleEndgameRequest("Who wins?", [], badEchoLlm, { fen, side: "black", lines: engineLines });
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.answer!);
    expect(parsed.fen).toBe(fen);
  });
});

describe("formatEndgameLines", () => {
  test("formats each line as `UCI... = <eval>`", () => {
    const out = formatEndgameLines([
      line(1, "e2e4 e7e5", { type: "cp", value: 120 }),
      line(2, "d2d4", { type: "mate", value: 5 })
    ]);
    expect(out).toContain("Line 1: e2e4 e7e5 = +1.2");
    expect(out).toContain("Line 2: d2d4 = mate 5");
  });
});
