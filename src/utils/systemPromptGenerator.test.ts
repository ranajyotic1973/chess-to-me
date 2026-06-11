import { generateSystemPrompt, generateLegacySystemPrompt, estimateTokenSavings } from "./systemPromptGenerator";

// ---------------------------------------------------------------------------
// generateSystemPrompt — Puzzle type — task 13.1
// ---------------------------------------------------------------------------
describe("generateSystemPrompt — Puzzle", () => {
  let prompt: string;

  beforeEach(() => {
    prompt = generateSystemPrompt({ responseType: "Puzzle" });
  });

  test("prompt includes 'Puzzle' as the response_type value", () => {
    expect(prompt).toContain('"response_type": "Puzzle"');
  });

  test("solution schema shows a JSON array (not a plain string) — prevents LLM hallucination", () => {
    // The schema must show ["e2e4", "d7d5"] — an array literal, not a bare string
    expect(prompt).toMatch(/"solution":\s*\[/);
  });

  test("prompt instructs LLM to use UCI move format (from+to)", () => {
    expect(prompt.toLowerCase()).toContain("uci");
  });

  test("prompt requires hidden_solution field set to true", () => {
    expect(prompt).toContain('"hidden_solution": true');
  });

  test("prompt instructs LLM that every solution move must be legal", () => {
    expect(prompt).toContain("legal");
  });

  test("prompt instructs LLM to include a step-by-step walkthrough in the explanation", () => {
    // explanation is gated by hidden_solution:true and only shown after "Reveal Solution"
    // so it SHOULD include a full move walkthrough for educational value
    expect(prompt.toLowerCase()).toMatch(/walkthrough|step-by-step/);
  });

  test("prompt requires a valid FEN string for the position", () => {
    expect(prompt).toContain("fen");
    expect(prompt).toMatch(/valid.*fen|fen.*valid/i);
  });

  test("prompt includes difficulty field", () => {
    expect(prompt).toContain("difficulty");
  });
});

// ---------------------------------------------------------------------------
// generateSystemPrompt — Analysis type
// ---------------------------------------------------------------------------
describe("generateSystemPrompt — Analysis", () => {
  let prompt: string;

  beforeEach(() => {
    prompt = generateSystemPrompt({ responseType: "Analysis" });
  });

  test("prompt includes 'Analysis' as the response_type value", () => {
    expect(prompt).toContain('"response_type": "Analysis"');
  });

  test("prompt includes lines field for inline display (task 13.5)", () => {
    expect(prompt).toContain('"lines"');
  });

  test("Analysis prompt does NOT include puzzle-specific fields", () => {
    expect(prompt).not.toContain('"hidden_solution"');
    expect(prompt).not.toContain('"solution"');
  });
});

// ---------------------------------------------------------------------------
// generateSystemPrompt — Position type
// ---------------------------------------------------------------------------
describe("generateSystemPrompt — Position", () => {
  let prompt: string;

  beforeEach(() => {
    prompt = generateSystemPrompt({ responseType: "Position" });
  });

  test("prompt includes 'Position' as the response_type value", () => {
    expect(prompt).toContain('"response_type": "Position"');
  });

  test("includes fen field for current position", () => {
    expect(prompt).toContain('"fen"');
  });

  test("Position prompt does NOT include solution field", () => {
    expect(prompt).not.toContain('"solution"');
  });
});

// ---------------------------------------------------------------------------
// generateSystemPrompt — language support
// ---------------------------------------------------------------------------
describe("generateSystemPrompt — language", () => {
  test("uses English by default", () => {
    const prompt = generateSystemPrompt({ responseType: "Analysis" });
    expect(prompt).toContain("Language: English");
  });

  test("uses specified language when provided", () => {
    const prompt = generateSystemPrompt({ responseType: "Analysis", language: "Spanish" });
    expect(prompt).toContain("Language: Spanish");
  });
});

// ---------------------------------------------------------------------------
// generateSystemPrompt — Game type (the else branch)
// ---------------------------------------------------------------------------
describe("generateSystemPrompt — Game", () => {
  let prompt: string;

  beforeEach(() => {
    prompt = generateSystemPrompt({ responseType: "Game" });
  });

  test("prompt includes 'Game' as the response_type value", () => {
    expect(prompt).toContain('"response_type": "Game"');
  });

  test("Game prompt includes annotations field", () => {
    expect(prompt).toContain('"annotations"');
  });

  test("Game prompt includes pgn field", () => {
    expect(prompt).toContain('"pgn"');
  });

  test("Game prompt does NOT include puzzle-specific fields", () => {
    expect(prompt).not.toContain('"solution"');
    expect(prompt).not.toContain('"hidden_solution"');
  });

  test("Game prompt mentions move quality symbols", () => {
    expect(prompt).toMatch(/!!\s*\(brilliant\)|brilliant/i);
  });
});

// ---------------------------------------------------------------------------
// generateLegacySystemPrompt
// ---------------------------------------------------------------------------
describe("generateLegacySystemPrompt", () => {
  test("returns a non-empty string", () => {
    const prompt = generateLegacySystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
  });

  test("mentions chess analysis role", () => {
    const prompt = generateLegacySystemPrompt();
    expect(prompt.toLowerCase()).toContain("chess");
  });

  test("instructs to avoid generic AI commentary", () => {
    const prompt = generateLegacySystemPrompt();
    expect(prompt).toContain("generic AI commentary");
  });
});

// ---------------------------------------------------------------------------
// estimateTokenSavings
// ---------------------------------------------------------------------------
describe("estimateTokenSavings", () => {
  test("returns legacy, optimized, and savings fields", () => {
    const result = estimateTokenSavings();
    expect(typeof result.legacy).toBe("number");
    expect(typeof result.optimized).toBe("number");
    expect(typeof result.savings).toBe("string");
  });

  test("legacy token estimate is a positive number", () => {
    expect(estimateTokenSavings().legacy).toBeGreaterThan(0);
  });

  test("savings string ends with %", () => {
    expect(estimateTokenSavings().savings).toMatch(/%$/);
  });
});
