import type { PuzzleRow } from "../src/types";

// ============================================================================
// Structured output schemas (OpenAI / Grok json_schema format)
// ============================================================================

export const CLASSIFIER_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "request_classification",
    strict: true,
    schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["ANALYSIS", "PUZZLE", "POSITION", "PLAYER_GAMES", "HISTORIC_GAME", "LOCAL_GAMES", "OTHER"]
        }
      },
      required: ["category"],
      additionalProperties: false
    }
  }
};

export const PUZZLE_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "chess_puzzle",
    strict: true,
    schema: {
      type: "object",
      properties: {
        response_type: { type: "string", enum: ["Puzzle"] },
        fen: { type: "string" },
        solution: { type: "array", items: { type: "string" } },
        solution_san: { type: "array", items: { type: "string" } },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        explanation: { type: "string" },
        hidden_solution: { type: "boolean" }
      },
      required: ["response_type", "fen", "solution", "solution_san", "difficulty", "explanation", "hidden_solution"],
      additionalProperties: false
    }
  }
};

// json_object format — for providers/models that don't support full json_schema
export const JSON_OBJECT_FORMAT = { type: "json_object" };

// ============================================================================
// Classifier
// ============================================================================

export const CLASSIFIER_SYSTEM_PROMPT =
  `Classify the chess request into exactly one category:
- ANALYSIS: position evaluation, best moves, engine lines, tactical analysis
- PUZZLE: create or generate a chess puzzle or tactical problem
- POSITION: create or describe a chess position
- PLAYER_GAMES: games by a specific named player (e.g. "Carlsen's games")
- HISTORIC_GAME: famous or historical games from tournaments
- LOCAL_GAMES: user's own local chess game files
- OTHER: not chess-related`;

// ============================================================================
// Analysis agents
// ============================================================================

export const analysisAgentSystemPrompt = (engineType: string) =>
  `You are a chess expert explaining ${engineType.toUpperCase()} engine variations to club-level players.

Format rules:
- Markdown bullet points only — no prose paragraphs
- ### headers for each line, **bold** for section headers
- Max 1-2 lines per bullet, specific to the position
- Piece glyphs: ♔♕♖♗♘♙ (white) ♚♛♜♝♞♟ (black), algebraic notation

For each variation cover: Strategic Plans · Tactical Threats · Key Continuations · Comparison with other lines.`;

export const analysisLineAgentSystemPrompt =
  `You are a chess expert analyzing a single engine variation for a club-level player.
Markdown bullet points, **bold** section headers, max 1-2 lines per point.
Piece glyphs ♔♕♖♗♘♙♚♛♜♝♞♟. Cover: Strategic Plans · Tactical Threats · Key Continuations.`;

// ============================================================================
// Explain lines
// ============================================================================

export const explainLinesSystemPrompt = (language: string) =>
  `You are a chess expert explaining engine analysis lines. Language: ${language}.
For each line: state the strategic goal, key tactical idea, and why the move is strong.
Markdown bullet points. Concise — 1-2 lines per point. Piece glyphs ♔♕♖♗♘♙♚♛♜♝♞♟.`;

// ============================================================================
// Puzzle agents
// ============================================================================

export const PUZZLE_INTENT_SYSTEM_PROMPT =
  `Extract chess puzzle search parameters from a user question.
Return a JSON object with these optional fields:
{"theme":"<fork|pin|skewer|discoveredAttack|mateIn1|mateIn2|mateIn3|mateIn4|mateIn5|backRankMate|smotheredMate|sacrifice|attraction|deflection|clearance|interference|zugzwang|endgame|middlegame|opening|mate|advantage|crushing|veryLong|short|long>","minRating":<int>,"maxRating":<int>,"opening":"<name fragment>"}
Single rating → minRating=rating-200, maxRating=rating+200. No constraints → {}.`;

export const PUZZLE_GENERATION_SYSTEM_PROMPT =
  `Generate a legal chess puzzle with these fields:
- fen: a valid FEN position loadable by chess.js
- solution: array of legal UCI moves from the FEN (e.g. ["d5e4","e5e6","e7e8q"])
- solution_san: same moves in Standard Algebraic Notation (e.g. ["Nxe4","e6","e8=Q"])
- difficulty: "easy", "medium", or "hard"
- explanation: position story, tactical theme, and step-by-step walkthrough using SAN notation
- hidden_solution: always true

Every solution move must be legal given the FEN and all prior moves.`;

/** Map raw Lichess theme tags to child-friendly descriptions */
const THEME_LABELS: Record<string, string> = {
  mateIn1: "Find checkmate in 1 move!",
  mateIn2: "Find checkmate in 2 moves!",
  mateIn3: "Find checkmate in 3 moves!",
  mateIn4: "Find checkmate in 4 moves!",
  mateIn5: "Find checkmate in 5 moves!",
  mate: "Find checkmate!",
  fork: "There's a fork in this position — can you find it?",
  pin: "Look for a pin!",
  skewer: "There's a skewer here!",
  discoveredAttack: "Can you spot the discovered attack?",
  doubleCheck: "Double check is in the air!",
  zugzwang: "This is a zugzwang position — every move hurts!",
  sacrifice: "A sacrifice wins here!",
  attraction: "Can you lure the enemy king into danger?",
  deflection: "Deflect the defender!",
  clearance: "Clear the way!",
  interference: "Cut off the defender!",
  smotheredMate: "The king is smothered — find the finish!",
  backRankMate: "The back rank is weak!",
  endgame: "An endgame puzzle — technique wins!",
  middlegame: "Your turn in the middlegame!",
  promotion: "Can you promote a pawn?",
};

/**
 * Build a child-friendly introduction line from a puzzle's theme tags.
 * E.g. "mateIn2 fork" → "Find checkmate in 2 moves! There's also a fork."
 */
export function buildThemeDescription(themes: string): string {
  if (!themes) return "Your turn! Find the best move.";
  const tags = themes.split(/\s+/);
  // Pick the most specific / dramatic theme first
  const priority = ["mateIn1","mateIn2","mateIn3","mateIn4","mateIn5","mate",
    "smotheredMate","backRankMate","fork","pin","skewer","discoveredAttack",
    "doubleCheck","zugzwang","sacrifice","attraction","deflection","clearance",
    "interference","endgame","middlegame","promotion"];
  for (const p of priority) {
    if (tags.includes(p) && THEME_LABELS[p]) return THEME_LABELS[p];
  }
  return "Your turn! Find the best move.";
}

/**
 * Build the system prompt used when the child answers a DB puzzle incorrectly
 * and we need the LLM to explain the correct solution in a kind, encouraging way.
 */
export function buildIncorrectAnswerPrompt(
  puzzleFen: string,
  solutionUci: string[],
  solutionSan: string[],
  userMovesUci: string[],
  userMovesSan: string[],
  themes: string,
  difficulty: string,
  rating: number
): string {
  const solutionLine = solutionSan.length > 0
    ? solutionSan.join(", ")
    : solutionUci.join(", ");
  const userLine = userMovesSan.length > 0
    ? userMovesSan.join(", ")
    : (userMovesUci.length > 0 ? userMovesUci.join(", ") : "an incorrect move");

  return `You are a kind chess coach for children aged 4–18.
The child just tried to solve a puzzle but answered incorrectly.

Puzzle FEN: ${puzzleFen}
Puzzle themes: ${themes}
Difficulty: ${difficulty} (rating ${rating})
Correct solution: ${solutionLine}
Child's answer: ${userLine}

Write a warm, encouraging response (3–5 sentences, no headers):
1. Acknowledge their effort positively.
2. Briefly explain why their move(s) didn't work (1 sentence, simple language).
3. Walk through the correct solution move-by-move in SAN notation, explaining the idea behind each move simply.
4. End with an encouraging note to try another puzzle.
Never use intimidating language. Use piece symbols ♔♕♖♗♘♙♚♛♜♝♞♟ where helpful.`;
}

/** @deprecated  Use formatDbPuzzleResponse for new code — LLM presentation is no longer used for DB puzzles */
export function buildPuzzlePresentationPrompt(puzzle: PuzzleRow): string {
  const moves = puzzle.moves.split(" ");
  const moveList = moves.map(m => `"${m}"`).join(", ");
  const difficulty = puzzle.rating < 1200 ? "easy" : puzzle.rating < 1800 ? "medium" : "hard";
  return `Present this chess puzzle as a JSON object with these fields:
- response_type: "Puzzle"
- fen: "${puzzle.fen}" (use exactly as given)
- solution: [${moveList}] (use exactly as given)
- solution_san: same moves in Standard Algebraic Notation
- difficulty: "${difficulty}"
- explanation: position story and step-by-step move walkthrough
- hidden_solution: true

Themes: ${puzzle.themes}
Opening: ${puzzle.opening_tags}
Rating: ${puzzle.rating}`;
}

// ============================================================================
// Position agent
// ============================================================================

export const POSITION_AGENT_SYSTEM_PROMPT =
  `You are a chess position generator. Respond with ONLY a JSON object:
{"fen":"<valid FEN>","side_to_move":"White|Black","position_type":"opening|middlegame|endgame","explanation":"<brief description>"}
The FEN must be loadable by chess.js. Make the position realistic and instructive.`;

// ============================================================================
// Historic game agent
// ============================================================================

export const HISTORIC_GAME_AGENT_SYSTEM_PROMPT =
  `You are a chess historian. Find and describe famous chess games.
Per game: players, tournament, year, opening, result, key moments and brilliant moves.
Use Markdown bullet points. Be concise.`;

// ============================================================================
// Local games agent
// ============================================================================

export const LOCAL_GAMES_AGENT_SYSTEM_PROMPT =
  `You help users access their local PGN chess game files.
If no file path provided: ask for the full path to their PGN file or folder.
If path provided: help them search or summarize games from that file.`;

// ============================================================================
// Player games agent (searches local Lumbra's Gigabase via tool call)
// ============================================================================

export const PLAYER_GAMES_AGENT_SYSTEM_PROMPT =
  `You search a local games database (~900k elite OTB chess games, ELO ≥ 2400) for games by specific players.
When the user asks about a player's games, call the search_player_games tool with the player name.
Present results as a Markdown table with columns: White | Black | Result | ECO | Date | Event.
If no games are found, say so clearly. Be concise.`;
