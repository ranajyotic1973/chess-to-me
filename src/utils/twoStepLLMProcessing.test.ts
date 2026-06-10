import { quickDetectAnalysisRequired, determineRequestType } from "./twoStepLLMProcessing";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const LLM_CONFIG = {
  llmProvider: "ollama",
  model: "qwen3",
  baseUrl: "http://localhost:11434",
  llmApiKey: "",
  language: "English"
};

// ---------------------------------------------------------------------------
// quickDetectAnalysisRequired (pure — no mock needed)
// ---------------------------------------------------------------------------
describe("quickDetectAnalysisRequired", () => {
  test("returns true for 'best move' keyword", () => {
    expect(quickDetectAnalysisRequired("What's the best move here?")).toBe(true);
  });

  test("returns true for 'evaluate'", () => {
    expect(quickDetectAnalysisRequired("Please evaluate this position")).toBe(true);
  });

  test("returns true for 'analyze'", () => {
    expect(quickDetectAnalysisRequired("Can you analyze this?")).toBe(true);
  });

  test("returns true for 'analysis'", () => {
    expect(quickDetectAnalysisRequired("Give me a full analysis")).toBe(true);
  });

  test("returns true for 'engine'", () => {
    expect(quickDetectAnalysisRequired("What does the engine say?")).toBe(true);
  });

  test("returns true for 'variation'", () => {
    expect(quickDetectAnalysisRequired("Show me a good variation")).toBe(true);
  });

  test("returns true for 'checkmate'", () => {
    expect(quickDetectAnalysisRequired("Is there a checkmate in 3?")).toBe(true);
  });

  test("returns true for 'advantage'", () => {
    expect(quickDetectAnalysisRequired("Who has the advantage?")).toBe(true);
  });

  test("returns true for 'winning'", () => {
    expect(quickDetectAnalysisRequired("Is White winning?")).toBe(true);
  });

  test("returns true for 'tactical'", () => {
    expect(quickDetectAnalysisRequired("Any tactical ideas?")).toBe(true);
  });

  test("returns false for a simple puzzle question", () => {
    expect(quickDetectAnalysisRequired("Create a chess puzzle for me")).toBe(false);
  });

  test("returns false for a position description request", () => {
    expect(quickDetectAnalysisRequired("Describe this position for me")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(quickDetectAnalysisRequired("")).toBe(false);
  });

  test("is case-insensitive", () => {
    expect(quickDetectAnalysisRequired("BEST MOVE please")).toBe(true);
    expect(quickDetectAnalysisRequired("ANALYZE this")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// determineRequestType — with mocked electronAPI
// ---------------------------------------------------------------------------
describe("determineRequestType", () => {
  let mockAPI: any;

  beforeEach(() => {
    mockAPI = { askQuestion: jest.fn() };
  });

  test("returns Analysis fallback when electronAPI lacks askQuestion", async () => {
    const result = await determineRequestType({}, "What's the best move?", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
    expect(result.confidence).toBe(0.5);
  });

  test("returns Analysis fallback when API call fails", async () => {
    mockAPI.askQuestion.mockRejectedValue(new Error("Network error"));
    const result = await determineRequestType(mockAPI, "Analyze this", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
    expect(result.confidence).toBe(0.5);
  });

  test("returns Analysis fallback when response is not ok", async () => {
    mockAPI.askQuestion.mockResolvedValue({ ok: false });
    const result = await determineRequestType(mockAPI, "Analyze this", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
  });

  test("parses Puzzle type from LLM response", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type":"Puzzle","requiresEngineAnalysis":false,"reasoning":"user wants a puzzle"}'
    });
    const result = await determineRequestType(mockAPI, "Create a puzzle", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Puzzle");
    expect(result.requiresEngineAnalysis).toBe(false);
    expect(result.confidence).toBe(0.8);
  });

  test("parses Analysis type requiring engine", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type":"Analysis","requiresEngineAnalysis":true,"reasoning":"position analysis"}'
    });
    const result = await determineRequestType(mockAPI, "What's best?", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
    expect(result.requiresEngineAnalysis).toBe(true);
  });

  test("parses Position type", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type":"Position","requiresEngineAnalysis":false,"reasoning":"positional"}'
    });
    const result = await determineRequestType(mockAPI, "Describe the position", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Position");
  });

  test("parses Game type", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type":"Game","requiresEngineAnalysis":false,"reasoning":"game annotation"}'
    });
    const result = await determineRequestType(mockAPI, "Annotate this game", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Game");
  });

  test("falls back gracefully when LLM returns non-JSON answer", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: "I cannot determine the type right now."
    });
    const result = await determineRequestType(mockAPI, "Something", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
    expect(result.confidence).toBe(0.5);
  });

  test("falls back gracefully when LLM returns malformed JSON", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type": "Puzzle", bad json}'
    });
    const result = await determineRequestType(mockAPI, "Something", START_FEN, LLM_CONFIG);
    expect(result.type).toBe("Analysis");
  });

  test("passes correct payload to askQuestion", async () => {
    mockAPI.askQuestion.mockResolvedValue({
      ok: true,
      answer: '{"type":"Analysis","requiresEngineAnalysis":true}'
    });
    await determineRequestType(mockAPI, "best move?", START_FEN, LLM_CONFIG);
    const call = mockAPI.askQuestion.mock.calls[0][0];
    expect(call.question).toBe("best move?");
    expect(call.fen).toBe(START_FEN);
    expect(call.language).toBe("English");
    expect(call.model).toBe("qwen3");
    expect(call.systemPrompt).toBeDefined();
  });
});
