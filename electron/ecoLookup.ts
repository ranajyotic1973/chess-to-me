import * as fs from "fs";
import * as path from "path";
import { Chess } from "chess.js";

export interface EcoMatch {
  eco: string;
  name: string;
}

interface OpeningEntry {
  eco: string;
  name: string;
}

type OpeningCollection = Record<string, OpeningEntry>;
type PositionBook = Record<string, string[]>;

// Bundled locally under data/eco/ (see scripts that fetched them from
// https://github.com/JeffML/eco.json) — no network access at runtime.
const ECO_DATA_FILES = ["ecoA.json", "ecoB.json", "ecoC.json", "ecoD.json", "ecoE.json", "eco_interpolated.json"];

let cachedBook: OpeningCollection | null = null;
let cachedPositionBook: PositionBook | null = null;
let ecoAvailable = false;

/** Resolves the directory containing the bundled ECO JSON files, relative to this compiled file. */
function defaultEcoDataDir(): string {
  // Compiled to electron/dist/ecoLookup.js — two levels up is the project root in dev;
  // electron-builder's extraResources entry copies the same folder alongside resources in prod.
  return path.join(__dirname, "..", "..", "data", "eco");
}

function buildPositionBook(book: OpeningCollection): PositionBook {
  const positionToFen: PositionBook = {};
  for (const fen in book) {
    const position = fen.split(" ")[0];
    (positionToFen[position] ??= []).push(fen);
  }
  return positionToFen;
}

function findOpening(book: OpeningCollection, fen: string, positionBook?: PositionBook): OpeningEntry | undefined {
  let opening = book[fen];
  if (!opening && positionBook) {
    const position = fen.split(" ")[0];
    const posEntry = positionBook[position];
    if (posEntry && posEntry.length > 0) {
      opening = book[posEntry[0]];
    }
  }
  return opening;
}

/**
 * Call once at main-process startup. Loads the bundled ECO opening data files from disk
 * (no network access, no third-party module-loading quirks). If the files are missing,
 * logs a warning and all subsequent lookup calls return null.
 */
export async function initEcoLookup(baseDir?: string): Promise<void> {
  try {
    const dir = baseDir || defaultEcoDataDir();
    const book: OpeningCollection = {};
    for (const file of ECO_DATA_FILES) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      Object.assign(book, JSON.parse(raw));
    }

    cachedBook = book;
    cachedPositionBook = buildPositionBook(book);
    ecoAvailable = true;
    console.log(`[ECO] Opening book loaded successfully (${Object.keys(book).length} positions).`);
  } catch (err) {
    console.warn("[ECO] eco data not available — opening lookup disabled.", String(err));
    ecoAvailable = false;
  }
}

/**
 * Look up the opening for a given FEN string.
 * Returns { eco, name } or null when the position is unknown or the library is unavailable.
 */
export function lookupOpeningByFen(fen: string): EcoMatch | null {
  if (!ecoAvailable || !cachedBook) return null;
  try {
    const result = findOpening(cachedBook, fen, cachedPositionBook ?? undefined);
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

/**
 * Check if a given position FEN is a valid named opening position.
 * Returns true only if:
 * 1. The position exists in the ECO database (is a recognized opening)
 * 2. The position is not too shallow (at least move 4 of the game)
 *
 * This prevents explaining positions like "after 1.e4" which are not
 * actual playable openings, only the starting point for opening theory.
 */
export function isValidOpeningPosition(fen: string): boolean {
  if (!ecoAvailable || !cachedBook) return false;
  try {
    // Check if position exists in ECO database
    const opening = findOpening(cachedBook, fen, cachedPositionBook ?? undefined);
    if (!opening) return false;

    // Extract move number from FEN (last field before move counter)
    // FEN format: "piece_placement active_color castling en_passant halfmove_clock fullmove_number"
    const fenParts = fen.split(" ");
    const moveNumber = parseInt(fenParts[5] || "1", 10);

    // Only consider it a valid opening position if we're at least 4 moves in
    // (i.e., after Black's 2nd move, which is move 4 in the game)
    return moveNumber >= 4;
  } catch {
    return false;
  }
}

/** True once initEcoLookup() has completed successfully. */
export function isEcoAvailable(): boolean {
  return ecoAvailable;
}
