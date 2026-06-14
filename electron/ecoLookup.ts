import { Chess } from "chess.js";
import type { Opening, OpeningCollection } from "@chess-openings/eco.json";
import type { PositionBook } from "@chess-openings/eco.json";

export interface EcoMatch {
  eco: string;
  name: string;
}

let cachedBook: OpeningCollection | null = null;
let cachedPositionBook: PositionBook | null = null;
let ecoAvailable = false;

// Lazily-imported functions — populated by initEcoLookup()
let _findOpening: ((book: OpeningCollection, fen: string, posBook?: PositionBook) => Opening | undefined) | null = null;
let _getPositionBook: ((book: OpeningCollection) => PositionBook) | null = null;

/**
 * Call once at main-process startup.  Downloads ECO data from GitHub and caches
 * it in memory.  If the network is unavailable or the package is missing, logs a
 * warning and all subsequent lookup calls return null.
 */
export async function initEcoLookup(): Promise<void> {
  try {
    // Dynamic import so a missing package does not crash the process at module load.
    const ecoModule = await import("@chess-openings/eco.json");
    const { openingBook, findOpening, getPositionBook } = ecoModule;

    _findOpening = findOpening;
    _getPositionBook = getPositionBook;

    cachedBook = await openingBook();
    cachedPositionBook = getPositionBook(cachedBook);
    ecoAvailable = true;
    console.log("[ECO] Opening book loaded successfully.");
  } catch (err) {
    console.warn("[ECO] eco.json not available — opening lookup disabled.", String(err));
    ecoAvailable = false;
  }
}

/**
 * Look up the opening for a given FEN string.
 * Returns { eco, name } or null when the position is unknown or the library is unavailable.
 */
export function lookupOpeningByFen(fen: string): EcoMatch | null {
  if (!ecoAvailable || !cachedBook || !_findOpening) return null;
  try {
    const result = _findOpening(cachedBook, fen, cachedPositionBook ?? undefined);
    if (!result) return null;
    return { eco: result.eco, name: result.name };
  } catch {
    return null;
  }
}

/**
 * Walk a sequence of UCI moves from an optional start FEN, calling lookupOpeningByFen
 * at each position, and return the last non-null match.
 * This gives the deepest named variation reached.
 */
export function lookupOpeningByMoves(moves: string[], startFen?: string): EcoMatch | null {
  if (!ecoAvailable || moves.length === 0) return null;
  try {
    const chess = new Chess();
    if (startFen) chess.load(startFen);

    let best: EcoMatch | null = null;

    for (const uci of moves) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;

      const moved = chess.move({ from, to, promotion });
      if (!moved) break;

      const match = lookupOpeningByFen(chess.fen());
      if (match) best = match;
    }

    return best;
  } catch {
    return null;
  }
}

/** True once initEcoLookup() has completed successfully. */
export function isEcoAvailable(): boolean {
  return ecoAvailable;
}
