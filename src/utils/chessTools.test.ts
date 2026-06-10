import { Chess } from "chess.js";
import { executeChessTool, formatToolsForPrompt, CHESS_TOOLS_SCHEMA } from "./chessTools";

// ---------------------------------------------------------------------------
// executeChessTool
// ---------------------------------------------------------------------------
describe("executeChessTool — is_move_legal", () => {
  let chess: Chess;

  beforeEach(() => {
    chess = new Chess(); // starting position
  });

  test("returns legal:true for a valid opening move", () => {
    const result = JSON.parse(executeChessTool(chess, { function: "is_move_legal", args: { from: "e2", to: "e4" } }));
    expect(result.legal).toBe(true);
    expect(result.from).toBe("e2");
    expect(result.to).toBe("e4");
  });

  test("returns legal:false for an illegal move", () => {
    const result = JSON.parse(executeChessTool(chess, { function: "is_move_legal", args: { from: "e2", to: "e5" } }));
    expect(result.legal).toBe(false);
  });
});

describe("executeChessTool — get_legal_moves", () => {
  test("returns count and first 20 moves in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_legal_moves", args: {} }));
    expect(result.count).toBe(20);
    expect(Array.isArray(result.moves)).toBe(true);
    expect(result.moves.length).toBeLessThanOrEqual(20);
  });
});

describe("executeChessTool — get_position_fen", () => {
  test("returns current FEN", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_position_fen", args: {} }));
    expect(result.fen).toBe(chess.fen());
    expect(result.fen).toContain("PPPPPPPP");
  });
});

describe("executeChessTool — get_board_ascii", () => {
  test("returns an ascii representation", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_board_ascii", args: {} }));
    expect(typeof result.ascii).toBe("string");
    expect(result.ascii.length).toBeGreaterThan(10);
  });
});

describe("executeChessTool — get_move_san", () => {
  test("returns SAN for a valid move", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_move_san", args: { from: "e2", to: "e4" } }));
    expect(result.san).toBe("e4");
  });

  test("returns 'Invalid move' for an illegal move", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_move_san", args: { from: "e2", to: "e5" } }));
    expect(result.san).toBe("Invalid move");
  });
});

describe("executeChessTool — get_piece_at", () => {
  test("identifies White Pawn at e2 in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_piece_at", args: { square: "e2" } }));
    expect(result.piece).toBe("White P");
    expect(result.color).toBe("w");
    expect(result.type).toBe("p");
  });

  test("identifies empty square", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_piece_at", args: { square: "e4" } }));
    expect(result.piece).toBe("Empty");
    expect(result.color).toBeUndefined();
  });
});

describe("executeChessTool — is_check / is_checkmate / is_stalemate", () => {
  test("is_check returns false in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "is_check", args: {} }));
    expect(result.inCheck).toBe(false);
  });

  test("is_checkmate returns false in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "is_checkmate", args: {} }));
    expect(result.isCheckmate).toBe(false);
  });

  test("is_stalemate returns false in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "is_stalemate", args: {} }));
    expect(result.isStalemate).toBe(false);
  });

  test("is_checkmate returns true in Scholar's mate position", () => {
    const chess = new Chess();
    // Scholar's mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#
    chess.loadPgn("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7");
    const result = JSON.parse(executeChessTool(chess, { function: "is_checkmate", args: {} }));
    expect(result.isCheckmate).toBe(true);
  });
});

describe("executeChessTool — get_game_status", () => {
  test("returns status object in starting position", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "get_game_status", args: {} }));
    expect(result.turn).toBe("White");
    expect(result.inCheck).toBe(false);
    expect(result.isCheckmate).toBe(false);
    expect(result.isStalemate).toBe(false);
    expect(result.isGameOver).toBe(false);
    expect(result.fen).toBe(chess.fen());
  });
});

describe("executeChessTool — unknown function", () => {
  test("returns error for unknown function name", () => {
    const chess = new Chess();
    const result = JSON.parse(executeChessTool(chess, { function: "unknown_func", args: {} }));
    expect(result.error).toContain("Unknown function");
  });
});

// ---------------------------------------------------------------------------
// formatToolsForPrompt
// ---------------------------------------------------------------------------
describe("formatToolsForPrompt", () => {
  test("returns a string containing tool names", () => {
    const prompt = formatToolsForPrompt();
    expect(prompt).toContain("is_move_legal");
    expect(prompt).toContain("get_legal_moves");
    expect(prompt).toContain("get_position_fen");
    expect(prompt).toContain("is_checkmate");
  });

  test("includes 'Available Chess Tools' header", () => {
    const prompt = formatToolsForPrompt();
    expect(prompt).toContain("Available Chess Tools");
  });
});

// ---------------------------------------------------------------------------
// CHESS_TOOLS_SCHEMA
// ---------------------------------------------------------------------------
describe("CHESS_TOOLS_SCHEMA", () => {
  test("exports an array with at least 10 tools", () => {
    expect(Array.isArray(CHESS_TOOLS_SCHEMA)).toBe(true);
    expect(CHESS_TOOLS_SCHEMA.length).toBeGreaterThanOrEqual(10);
  });

  test("each tool has name, description, and parameters", () => {
    CHESS_TOOLS_SCHEMA.forEach((tool) => {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(tool.parameters).toBeDefined();
    });
  });
});
