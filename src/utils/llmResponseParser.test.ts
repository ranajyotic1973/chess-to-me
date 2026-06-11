import { parseLLMResponse, validateLLMResponse, formatConversationHistory } from "./llmResponseParser";

// ---------------------------------------------------------------------------
// parseLLMResponse — task 13.1 (solution array extracted from Puzzle response)
// ---------------------------------------------------------------------------
describe("parseLLMResponse — Puzzle solution field", () => {
  test("extracts solution array from a valid Puzzle response (task 13.1)", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: ["d7d5", "e4d5"],
      explanation: "Win a pawn with a surprise capture.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.ok).toBe(true);
    expect(result.response_type).toBe("Puzzle");
    expect(result.solution).toEqual(["d7d5", "e4d5"]);
  });

  test("solution is undefined when field is absent", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      explanation: "No solution provided.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.solution).toBeUndefined();
  });

  test("solution is undefined when field is a string instead of array (LLM hallucination guard)", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: "d7d5 e4d5",
      explanation: "Wrong format.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.solution).toBeUndefined();
  });

  test("solution is undefined when field is null", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: null,
      explanation: "Null solution.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.solution).toBeUndefined();
  });

  test("accepts empty solution array", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: [],
      explanation: "No moves.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.solution).toEqual([]);
  });

  test("preserves all solution moves in order", () => {
    const moves = ["e2e4", "d7d5", "e4e5", "f7f6", "e5f6"];
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: moves,
      explanation: "En passant puzzle.",
      hidden_solution: true
    });

    const result = parseLLMResponse(raw);
    expect(result.solution).toEqual(moves);
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse — DB puzzle metadata fields
// ---------------------------------------------------------------------------
describe("parseLLMResponse — DB puzzle metadata fields", () => {
  const dbPuzzleJson = JSON.stringify({
    response_type: "Puzzle",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    solution: ["d7d5"],
    solution_san: ["d5"],
    side_to_move: "Black",
    hidden_solution: true,
    explanation: "Find the best move. **Black to move.**",
    themes: "mateIn3 fork",
    difficulty: "medium",
    rating: 1428,
    opening_tags: "Sicilian Defense",
    puzzle_id: "nJfvE",
    setup_move: "e2e4",
    setup_move_san: "e4"
  });

  test("extracts side_to_move", () => {
    expect(parseLLMResponse(dbPuzzleJson).side_to_move).toBe("Black");
  });

  test("extracts solution_san", () => {
    expect(parseLLMResponse(dbPuzzleJson).solution_san).toEqual(["d5"]);
  });

  test("extracts themes", () => {
    expect(parseLLMResponse(dbPuzzleJson).themes).toBe("mateIn3 fork");
  });

  test("extracts difficulty", () => {
    expect(parseLLMResponse(dbPuzzleJson).difficulty).toBe("medium");
  });

  test("extracts rating", () => {
    expect(parseLLMResponse(dbPuzzleJson).rating).toBe(1428);
  });

  test("extracts puzzle_id", () => {
    expect(parseLLMResponse(dbPuzzleJson).puzzle_id).toBe("nJfvE");
  });

  test("extracts setup_move_san", () => {
    expect(parseLLMResponse(dbPuzzleJson).setup_move_san).toBe("e4");
  });

  test("side_to_move is undefined when absent", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: ["d7d5"],
      explanation: "No metadata.",
      hidden_solution: true
    });
    expect(parseLLMResponse(raw).side_to_move).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse — general response parsing
// ---------------------------------------------------------------------------
describe("parseLLMResponse — response type normalization", () => {
  test("normalizes 'puzzle' (lowercase) to 'Puzzle'", () => {
    const raw = JSON.stringify({ response_type: "puzzle", explanation: "Find the best move." });
    expect(parseLLMResponse(raw).response_type).toBe("Puzzle");
  });

  test("normalizes 'analysis' to 'Analysis'", () => {
    const raw = JSON.stringify({ response_type: "analysis", explanation: "The position is equal." });
    expect(parseLLMResponse(raw).response_type).toBe("Analysis");
  });

  test("falls back to 'Analysis' for unknown type", () => {
    const raw = JSON.stringify({ response_type: "unknown_type", explanation: "Something." });
    expect(parseLLMResponse(raw).response_type).toBe("Analysis");
  });

  test("treats non-JSON text as a plain Analysis answer (ok:true)", () => {
    // ANALYSIS handler returns plain markdown — parser must not reject it
    const result = parseLLMResponse("### Why the king cannot capture\n- The rook controls h8.");
    expect(result.ok).toBe(true);
    expect(result.response_type).toBe("Analysis");
    expect(result.answer).toContain("Why the king");
  });

  test("returns ok:false for empty string", () => {
    const result = parseLLMResponse("   ");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Empty response from LLM");
  });

  test("extracts fen field for Puzzle type (task 13.1 — FEN applied to board)", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const raw = JSON.stringify({ response_type: "Puzzle", fen, explanation: "Solve this.", solution: ["d7d5"] });
    expect(parseLLMResponse(raw).fen).toBe(fen);
  });

  test("hidden_solution is true when set in response", () => {
    const raw = JSON.stringify({
      response_type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      solution: ["d7d5"],
      explanation: "Hidden.",
      hidden_solution: true
    });
    expect(parseLLMResponse(raw).hidden_solution).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateLLMResponse — Puzzle requires fen
// ---------------------------------------------------------------------------
describe("validateLLMResponse — Puzzle requirements", () => {
  test("valid Puzzle response passes validation", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "Puzzle",
      type: "Puzzle",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      answer: "Find the best move for black.",
      explanation: "Find the best move for black.",
      solution: ["d7d5"]
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Puzzle response without fen fails validation", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "Puzzle",
      type: "Puzzle",
      answer: "Find the best move for black.",
      explanation: "Find the best move for black."
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Puzzle response requires fen field");
  });

  test("flags missing response_type field", () => {
    const result = validateLLMResponse({
      ok: true,
      // no response_type or type
      answer: "Test"
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing response_type field");
  });

  test("Game response without annotations fails validation", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "Game",
      type: "Game",
      answer: "Here is the game.",
      explanation: "Here is the game."
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Game response requires annotations field");
  });

  test("response without answer or explanation fails", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "Analysis",
      type: "Analysis"
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Response must include answer or explanation");
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse — Game type
// ---------------------------------------------------------------------------
describe("parseLLMResponse — Game type", () => {
  test("normalizes 'game' to 'Game'", () => {
    const raw = JSON.stringify({ response_type: "game", explanation: "Annotated game." });
    expect(parseLLMResponse(raw).response_type).toBe("Game");
  });

  test("extracts annotations from Game response", () => {
    const raw = JSON.stringify({
      response_type: "Game",
      explanation: "Game analysis.",
      annotations: { "1": "!!", "3": "?" }
    });
    const result = parseLLMResponse(raw);
    expect(result.annotations).toEqual({ "1": "!!", "3": "?" });
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse — GameList type
// ---------------------------------------------------------------------------
describe("parseLLMResponse — GameList type", () => {
  const sampleGame = {
    game_id: 1,
    white: "Carlsen, Magnus",
    black: "Caruana, Fabiano",
    result: "1/2-1/2",
    white_elo: 2835,
    black_elo: 2832,
    eco: "C65",
    opening: "Ruy Lopez",
    date: "2018.11.28",
    event: "WCh 2018",
    pgn_moves: "1. e4 e5 2. Nf3"
  };

  test("normalises 'GameList' response_type", () => {
    const raw = JSON.stringify({ response_type: "GameList", game_list: [sampleGame], explanation: "Found 1 game." });
    expect(parseLLMResponse(raw).response_type).toBe("GameList");
  });

  test("normalises lowercase 'gamelist'", () => {
    const raw = JSON.stringify({ response_type: "gamelist", game_list: [], explanation: "No games." });
    expect(parseLLMResponse(raw).response_type).toBe("GameList");
  });

  test("extracts game_list array", () => {
    const raw = JSON.stringify({ response_type: "GameList", game_list: [sampleGame], explanation: "Found 1 game." });
    const result = parseLLMResponse(raw);
    expect(result.game_list).toHaveLength(1);
    expect(result.game_list![0].white).toBe("Carlsen, Magnus");
    expect(result.game_list![0].result).toBe("1/2-1/2");
  });

  test("game_list is undefined when field is absent", () => {
    const raw = JSON.stringify({ response_type: "GameList", explanation: "No games." });
    expect(parseLLMResponse(raw).game_list).toBeUndefined();
  });

  test("game_list is undefined when field is not an array", () => {
    const raw = JSON.stringify({ response_type: "GameList", game_list: "bad", explanation: "Bad." });
    expect(parseLLMResponse(raw).game_list).toBeUndefined();
  });

  test("empty game_list array is preserved", () => {
    const raw = JSON.stringify({ response_type: "GameList", game_list: [], explanation: "None found." });
    expect(parseLLMResponse(raw).game_list).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateLLMResponse — GameList
// ---------------------------------------------------------------------------
describe("validateLLMResponse — GameList", () => {
  test("GameList with explanation passes without answer field", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "GameList",
      type: "GameList",
      explanation: "Found 3 games.",
      game_list: []
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("GameList does not require annotations", () => {
    const result = validateLLMResponse({
      ok: true,
      response_type: "GameList",
      type: "GameList",
      explanation: "Found games."
    });
    expect(result.errors).not.toContain("Game response requires annotations field");
  });
});

// ---------------------------------------------------------------------------
// formatConversationHistory
// ---------------------------------------------------------------------------
describe("formatConversationHistory", () => {
  test("formats user and assistant turns", () => {
    const result = formatConversationHistory([
      { role: "user", message: "What is e4?" },
      { role: "assistant", message: "The King's Pawn opening." }
    ]);
    expect(result).toContain("User: What is e4?");
    expect(result).toContain("Assistant: The King's Pawn opening.");
  });

  test("separates turns with double newline", () => {
    const result = formatConversationHistory([
      { role: "user", message: "Q" },
      { role: "assistant", message: "A" }
    ]);
    expect(result).toContain("\n\n");
  });

  test("handles empty array", () => {
    expect(formatConversationHistory([])).toBe("");
  });
});
