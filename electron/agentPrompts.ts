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
          enum: ["ANALYSIS", "PUZZLE", "POSITION", "PLAYER_GAMES", "HISTORIC_GAME", "LOCAL_GAMES", "OTHER", "OPENING_TRAINING", "MIDDLEGAME_ANALYSIS", "ENDGAME_TRAINING"]
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

export const GAME_SEARCH_PARAMS_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "game_search_params",
    strict: false,
    schema: {
      type: "object",
      properties: {
        player:            { type: "string",  description: "Primary player name as likely stored in a chess DB (e.g. 'Kasparov', 'Carlsen')" },
        opponent:          { type: "string",  description: "Second player when query is about games between two specific players" },
        result:            { type: "string",  enum: ["1-0", "0-1", "1/2-1/2"], description: "Game result filter — use only when color is explicit (e.g. 'as white'). 1-0 = White won, 0-1 = Black won, 1/2-1/2 = draw" },
        player_won:        { type: "boolean", description: "True when user asks for wins by the primary player regardless of which color they played" },
        year_from:         { type: "integer", description: "Earliest year (inclusive)" },
        year_to:           { type: "integer", description: "Latest year (inclusive)" },
        opening_name:      { type: "string",  description: "Opening name to filter by (partial match, e.g. 'Sicilian', 'Ruy Lopez', 'King\\'s Indian')" },
        first_move_white:  { type: "string",  description: "White's first move in SAN notation (e.g. 'e4', 'd4', 'Nf3', 'c4')" },
        first_move_black:  { type: "string",  description: "Black's first move in SAN notation (e.g. 'e5', 'c5', 'd5', 'Nf6')" }
      },
      required: ["player"]
    }
  }
};

// json_object format — for providers/models that don't support full json_schema
export const JSON_OBJECT_FORMAT = { type: "json_object" };

// ============================================================================
// Game search parameter extraction
// ============================================================================

export const GAME_SEARCH_SYSTEM_PROMPT =
  `Extract chess game search parameters from the user's query and respond with JSON only.

Chess scoring: "1-0" means White won; "0-1" means Black won; "1/2-1/2" means draw.
In the database each game is stored as White vs Black, where White is the player who had the white pieces.

Fields:
- player (required): primary player name as it likely appears in a chess database — use last name or "Lastname, Firstname" form (e.g. "Kasparov", "Carlsen", "Tal")
- opponent (optional): second player when the query asks for games between two specific players
- result (optional): filter by exact result — "1-0" (White won), "0-1" (Black won), "1/2-1/2" (draw). Use ONLY when the user explicitly mentions a color (e.g. "as white", "playing black"). Do NOT use for general "player won" queries without color context.
- player_won (optional): set to true when the user asks for wins by the named player regardless of which color they played. Do not combine with result.
- year_from (optional): earliest year as an integer
- year_to (optional): latest year as an integer
- opening_name (optional): partial opening name when user asks for games in a specific opening (e.g. "Sicilian", "Ruy Lopez", "King's Indian Defense")
- first_move_white (optional): White's first move in SAN when user asks about games starting with a specific White first move (e.g. "e4", "d4", "Nf3", "c4")
- first_move_black (optional): Black's first move in SAN when user asks about games with a specific Black response (e.g. "e5", "c5", "d5", "Nf6")

Examples:
"show me Kasparov games" → {"player":"Kasparov"}
"games between Magnus and Karpov" → {"player":"Carlsen","opponent":"Karpov"}
"games of Magnus where he won" → {"player":"Carlsen","player_won":true}
"Kasparov wins as white against Karpov 1984-1986" → {"player":"Kasparov","opponent":"Karpov","result":"1-0","year_from":1984,"year_to":1986}
"Tal wins as black in 1960" → {"player":"Tal","result":"0-1","year_from":1960,"year_to":1960}
"Carlsen Sicilian Defense games" → {"player":"Carlsen","opening_name":"Sicilian"}
"Kasparov games starting with e4" → {"player":"Kasparov","first_move_white":"e4"}
"show me Fischer games where opponent played e5 against his e4" → {"player":"Fischer","first_move_white":"e4","first_move_black":"e5"}
"Karpov's Ruy Lopez games as white" → {"player":"Karpov","opening_name":"Ruy Lopez","result":"1-0"}`;

// ============================================================================
// Classifier
// ============================================================================

export const CLASSIFIER_SYSTEM_PROMPT =
  `Classify the chess request into exactly one category based on the user's INTENT, not on individual words.

Categories:
- ANALYSIS: pure engine evaluation or move calculation — "what's the best move?", "evaluate this position", "what does the engine think?", tactical calculation requests
- PUZZLE: generate or solve a chess puzzle or tactical problem
- POSITION: create or set up a chess position on the board
- PLAYER_GAMES: find or browse games by a specific named player (e.g. "Carlsen's games", "Kasparov Sicilian games", "Fischer games starting with e4") OR selecting a game by number from a previously shown list (user types just "1", "2", etc.)
- HISTORIC_GAME: famous or historical games from tournaments
- LOCAL_GAMES: user's own local chess game files
- OPENING_TRAINING: interactive opening LESSON where the user wants to LEARN or PRACTICE opening moves — e.g. "teach me the Ruy Lopez", "show me how the Sicilian starts", "I want to learn an opening for kids", "let's practice the King's Indian"
- MIDDLEGAME_ANALYSIS: interactive LESSON about middlegame strategy and plans — e.g. "teach me middlegame strategy", "what's the plan in this pawn structure?", "how do I improve my pieces?", "explain this middlegame position"
- ENDGAME_TRAINING: interactive LESSON about endgame technique — e.g. "teach me king and pawn endgames", "how to checkmate with a rook", "explain the Lucena position", "practice a rook ending"
- OTHER: not chess-related

DISAMBIGUATION RULES — read these carefully:
1. OPENING_TRAINING is ONLY for requests to learn or practice opening moves interactively. If the word "opening" appears but the user is asking to FIND GAMES (e.g. "Carlsen's Sicilian games", "show me games in the Ruy Lopez"), classify as PLAYER_GAMES.
2. MIDDLEGAME_ANALYSIS is ONLY for requests to be taught or coached about middlegame concepts. If the user asks "what's the best move here?" or "analyse this position", that is ANALYSIS even if the position happens to be a middlegame.
3. ENDGAME_TRAINING is ONLY for requests to learn endgame theory interactively. A question like "who is winning this endgame?" is ANALYSIS, not ENDGAME_TRAINING.
4. Use conversation history for context — if the previous message showed a game list and the user types "3", classify as PLAYER_GAMES (game selection).`;

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
  `You are a chess puzzle generator for children aged 4–18. Generate exactly ONE legal chess puzzle.

━━━ SOLUTION ACCURACY IS MANDATORY ━━━

MOVE COUNT RULES — follow exactly:
• Mate in 1 → solution has 1 move  (attacker mates immediately)
• Mate in 2 → solution has 3 moves (attacker, defender best reply, attacker mates)
• Mate in 3 → solution has 5 moves (attacker, defender, attacker, defender, attacker mates)
• Mate in N → solution has 2N−1 moves total
The FINAL move MUST leave the king in check with zero legal escape squares (checkmate).
The defender moves in between are the STRONGEST resistance — include them.

SELF-VERIFICATION (mandatory before writing the JSON):
1. Draw or visualise the board from the FEN
2. Play each solution move in sequence
3. After each move ask: "Is this move legal? Who is to move next?"
4. After the last move ask: "Is the king in check? Can it move? Can a piece block? Can the checking piece be taken?" — all three escapes must be impossible
5. If any step fails, choose a different, simpler combination

PREFER KNOWN TACTICAL PATTERNS (easier to verify):
• Back-rank mate — rook or queen slides to the back rank, king blocked by its own pawns
• Smothered mate — knight delivers check, the king is smothered by its own pieces
• Arabian mate — rook and knight cooperating in the corner
• Anastasia's mate — knight cuts off escape, rook delivers check on the h-file
• Legal's mate — queen sacrifice followed by a knight-and-bishop net
• Simple queen sacrifice + rook mate

A CORRECT simple puzzle beats an INCORRECT complex one. When in doubt, choose simpler.

FEN RULES:
• Use a realistic, reachable position — not random piece placement
• The side to move in the FEN is the side that delivers the first move of the solution
• Do not place pieces on illegal squares or create impossible castling rights

JSON response (no extra text, no markdown fences):
{
  "response_type": "Puzzle",
  "fen": "<valid FEN>",
  "solution": ["<UCI move 1>", "<UCI move 2>", ...],
  "solution_san": ["<SAN move 1>", "<SAN move 2>", ...],
  "difficulty": "easy" | "medium" | "hard",
  "explanation": "<tactical theme + encouraging step-by-step walkthrough in SAN for children>",
  "hidden_solution": true
}

UCI format: source-square + destination-square + optional promotion (e.g. "e2e4", "d1h5", "e7e8q").`;

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
