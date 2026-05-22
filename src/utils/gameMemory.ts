import type { GameMemoryEntry } from "../types";

const STORAGE_KEY = "chess-to-me:game-memory";

/**
 * Load game memory from storage
 */
export async function loadGameMemory(): Promise<GameMemoryEntry[]> {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return [];
  } catch (error) {
    console.error("Failed to load game memory:", error);
    return [];
  }
}

/**
 * Save game memory to storage
 */
export async function saveGameMemory(games: GameMemoryEntry[]): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    }
  } catch (error) {
    console.error("Failed to save game memory:", error);
  }
}

/**
 * Add a new annotated game to memory
 */
export function addGameToMemory(
  games: GameMemoryEntry[],
  pgn: string,
  annotations: Record<number, "!!" | "!" | "*" | "!?" | "??">
): GameMemoryEntry[] {
  const newGame: GameMemoryEntry = {
    pgn,
    annotations,
    timestamp: Date.now()
  };
  return [...games, newGame];
}

/**
 * Apply annotations to a PGN string
 */
export function applyAnnotationsToPgn(
  pgn: string,
  annotations: Record<number, "!!" | "!" | "*" | "!?" | "??">
): string {
  if (Object.keys(annotations).length === 0) {
    return pgn;
  }

  // Split PGN into moves and apply annotations
  let annotatedPgn = pgn;
  Object.entries(annotations).forEach(([moveNum, symbol]) => {
    // Find the move number in PGN and append annotation
    const moveNumPattern = new RegExp(`\\b${moveNum}\\.`, "g");
    const matches = Array.from(pgn.matchAll(moveNumPattern));

    if (matches.length > 0) {
      // This is a simplified approach; real PGN parsing would be more complex
      annotatedPgn = annotatedPgn.replace(moveNumPattern, `${moveNum}.`);
    }
  });

  return annotatedPgn;
}

/**
 * Parse move quality annotations from LLM response
 */
export function parseAnnotationsFromResponse(
  response: Record<string, any>
): Record<number, "!!" | "!" | "*" | "!?" | "??"> {
  if (!response.annotations) {
    return {};
  }

  const annotations: Record<number, "!!" | "!" | "*" | "!?" | "??"> = {};

  Object.entries(response.annotations).forEach(([key, value]) => {
    const moveNum = parseInt(key, 10);
    const symbol = String(value);

    if (["!!", "!", "*", "!?", "??"].includes(symbol)) {
      annotations[moveNum] = symbol as "!!" | "!" | "*" | "!?" | "??";
    }
  });

  return annotations;
}

/**
 * Format annotations for display
 */
export function formatAnnotationSymbol(symbol: "!!" | "!" | "*" | "!?" | "??"): string {
  switch (symbol) {
    case "!!":
      return "Brilliant Move 🌟";
    case "!":
      return "Excellent Move ✓";
    case "*":
      return "Best Move ⭐";
    case "!?":
      return "Dubious Move ⚠️";
    case "??":
      return "Blunder ❌";
    default:
      return "Move";
  }
}

/**
 * Clear all game memory
 */
export async function clearGameMemory(): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to clear game memory:", error);
  }
}

/**
 * Delete a specific game from memory
 */
export function deleteGameFromMemory(games: GameMemoryEntry[], timestamp: number): GameMemoryEntry[] {
  return games.filter((game) => game.timestamp !== timestamp);
}

/**
 * Export game to standard PGN format
 */
export function exportGameAsPgn(game: GameMemoryEntry): string {
  const header = `[Event "Chess-to-me Analysis"]
[Date "${new Date(game.timestamp).toISOString().split("T")[0]}"]
[Result "*"]

`;
  return header + game.pgn;
}
