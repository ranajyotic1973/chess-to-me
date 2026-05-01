import { Chess } from "chess.js";

/**
 * Chess.js tool definitions and executor for LLM function calling
 * Allows LLM to interact with chess board state and rules
 */

export interface ChessToolCall {
  function: string;
  args: Record<string, any>;
}

export const CHESS_TOOLS_SCHEMA = [
  {
    name: "is_move_legal",
    description: "Check if a move is legal in the current position",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source square (e.g., 'e2')" },
        to: { type: "string", description: "Destination square (e.g., 'e4')" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "get_legal_moves",
    description: "Get all legal moves in the current position",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_position_fen",
    description: "Get the current position in FEN notation",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_board_ascii",
    description: "Get ASCII representation of the current board",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_move_san",
    description: "Get Standard Algebraic Notation (SAN) for a move",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source square (e.g., 'e2')" },
        to: { type: "string", description: "Destination square (e.g., 'e4')" },
        promotion: { type: "string", description: "Promotion piece (q, r, b, n) if applicable" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "get_piece_at",
    description: "Get the piece at a specific square",
    parameters: {
      type: "object",
      properties: {
        square: { type: "string", description: "Square notation (e.g., 'e4')" }
      },
      required: ["square"]
    }
  },
  {
    name: "is_check",
    description: "Check if the current side is in check",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "is_checkmate",
    description: "Check if the current position is checkmate",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "is_stalemate",
    description: "Check if the current position is stalemate",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_game_status",
    description: "Get current game status and turn information",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export function executeChessTool(chess: Chess, toolCall: ChessToolCall): string {
  const { function: funcName, args } = toolCall;

  try {
    switch (funcName) {
      case "is_move_legal": {
        const moves = chess.moves({ square: args.from, verbose: true });
        const isLegal = moves.some((m) => m.to === args.to);
        return JSON.stringify({ legal: isLegal, from: args.from, to: args.to });
      }

      case "get_legal_moves": {
        const moves = chess.moves({ verbose: true });
        return JSON.stringify({
          count: moves.length,
          moves: moves.slice(0, 20).map((m) => `${m.san} (${m.from}${m.to})`)
        });
      }

      case "get_position_fen": {
        return JSON.stringify({ fen: chess.fen() });
      }

      case "get_board_ascii": {
        return JSON.stringify({ ascii: chess.ascii() });
      }

      case "get_move_san": {
        const moves = chess.moves({ square: args.from, verbose: true });
        const move = moves.find((m) => m.to === args.to && (!args.promotion || m.promotion === args.promotion));
        return JSON.stringify({ san: move?.san || "Invalid move", from: args.from, to: args.to });
      }

      case "get_piece_at": {
        const piece = chess.get(args.square);
        return JSON.stringify({
          square: args.square,
          piece: piece ? `${piece.color === "w" ? "White" : "Black"} ${piece.type.toUpperCase()}` : "Empty",
          color: piece?.color,
          type: piece?.type
        });
      }

      case "is_check": {
        return JSON.stringify({ inCheck: chess.isCheck() });
      }

      case "is_checkmate": {
        return JSON.stringify({ isCheckmate: chess.isCheckmate() });
      }

      case "is_stalemate": {
        return JSON.stringify({ isStalemate: chess.isStalemate() });
      }

      case "get_game_status": {
        const status = {
          turn: chess.turn() === "w" ? "White" : "Black",
          inCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          isStalemate: chess.isStalemate(),
          isDraw: chess.isDraw(),
          isGameOver: chess.isGameOver(),
          fen: chess.fen()
        };
        return JSON.stringify(status);
      }

      default:
        return JSON.stringify({ error: `Unknown function: ${funcName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message });
  }
}

export function formatToolsForPrompt(): string {
  return `
## Available Chess Tools

You can use the following functions to analyze the board position:

${CHESS_TOOLS_SCHEMA.map(
  (tool) => `
### ${tool.name}
${tool.description}
Parameters: ${JSON.stringify(tool.parameters.properties)}
`
).join("\n")}

When you need to analyze the board, call these functions to get accurate information.
`;
}
