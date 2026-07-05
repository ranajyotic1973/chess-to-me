import { Chess } from "chess.js";
import type Database from "better-sqlite3";
import type { AnalysisLine, Score } from "../src/types";

// ---------------------------------------------------------------------------
// Novelty detection via an opening-line index.
//
// For every game we walk the opening (up to NOVELTY_MAX_PLIES) and record a
// hash of each move-prefix together with how many games followed that exact
// line and, when known, the ECO code/name of the opening reached. Matching a
// candidate line is then a single hash lookup instead of a move-by-move walk.
//
// A line is "novel" when its move-prefix is rarely (or never) seen in the games
// database AND the engine still rates it close to its best line.
// ---------------------------------------------------------------------------

/** A line is "rare" when fewer than this many indexed games followed it. */
export const NOVELTY_FREQ_FLOOR = 3;

/** A line is "sound" when it is within this many centipawns of the best line. */
export const NOVELTY_EVAL_CP = 50;

/** How many plies (half-moves) of each game to index — the opening phase. */
export const NOVELTY_MAX_PLIES = 40;

/** Optional opening identifier: FEN after a move → its ECO code/name, or null. */
export type OpeningIdentifier = (fenAfterMove: string) => { eco: string; name: string } | null;

// Two-lane 32-bit FNV-style rolling hash (via Math.imul) → a 64-bit hex key.
// Cheap and dependency-free (no node:crypto per call), which keeps the indexer's
// CPU cost low, and it is byte-for-byte incremental so the build can hash each
// growing prefix in O(1) extra work instead of re-hashing the whole prefix.
const HASH_SEED_A = 0x811c9dc5;
const HASH_SEED_B = 0x1000193;

function feedHash(a: number, b: number, ch: number): [number, number] {
  return [Math.imul(a ^ ch, 0x01000193), Math.imul(b ^ ch, 0x85ebca6b)];
}

function feedString(a: number, b: number, s: string): [number, number] {
  for (let i = 0; i < s.length; i++) [a, b] = feedHash(a, b, s.charCodeAt(i));
  return [a, b];
}

function hashHex(a: number, b: number): string {
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable hash of a move-prefix (the opening line so far). UCI moves are joined
 * with spaces and hashed so any candidate line collapses to one short key. The
 * result matches the incremental hasher used during indexing.
 */
export function hashLine(uciMoves: string[]): string {
  const [a, b] = feedString(HASH_SEED_A, HASH_SEED_B, uciMoves.join(" "));
  return hashHex(a, b);
}

/**
 * Incremental prefix hasher: append UCI moves one at a time and read the hash of
 * the prefix so far. Produces the same value as `hashLine(prefixSoFar)` but in
 * O(len(move)) per step instead of O(len(prefix)).
 */
class PrefixHasher {
  private a = HASH_SEED_A;
  private b = HASH_SEED_B;
  private empty = true;

  push(uci: string): string {
    if (!this.empty) [this.a, this.b] = feedHash(this.a, this.b, 0x20 /* space */);
    this.empty = false;
    [this.a, this.b] = feedString(this.a, this.b, uci);
    return hashHex(this.a, this.b);
  }
}

/**
 * Pure novelty predicate: the line is rarely played AND within the soundness
 * threshold of the best line. `evalLossCp` is how many centipawns worse than
 * the best line this line is (always >= 0). Both constants are the tunables.
 */
export function isNovelLine(lineFreq: number, evalLossCp: number): boolean {
  return lineFreq < NOVELTY_FREQ_FLOOR && evalLossCp <= NOVELTY_EVAL_CP;
}

/** Convert a score to a centipawn value from White's perspective (mate → large). */
export function scoreToCp(score: Score | null | undefined): number | null {
  if (!score) return null;
  const s = score as any;
  if (s.type === "cp" && typeof s.value === "number") return s.value;
  if (s.type === "mate" && typeof s.value === "number") {
    const magnitude = 100000 - Math.abs(s.value);
    return s.value >= 0 ? magnitude : -magnitude;
  }
  if (typeof s.winProb === "number") return (s.winProb - 0.5) * 2000;
  return null;
}

/** First UCI move of a line (`pv`/`line`/`text`), or null if absent. */
export function firstMoveOf(line: AnalysisLine): string | null {
  const raw = (line.pv || line.line || line.text || "").trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0];
  return first || null;
}

/**
 * Replay a SAN move string into `{ uci, fenAfter }` per ply, up to `maxPlies`.
 * Stops cleanly on the first malformed/illegal move.
 */
export function pgnLineToUci(
  pgnMoves: string,
  maxPlies = NOVELTY_MAX_PLIES
): Array<{ uci: string; fenAfter: string }> {
  const chess = new Chess();
  const out: Array<{ uci: string; fenAfter: string }> = [];
  const tokens = (pgnMoves || "")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const san of tokens) {
    if (out.length >= maxPlies) break;
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      break;
    }
    if (!mv) break;
    out.push({ uci: `${mv.from}${mv.to}${mv.promotion ?? ""}`, fenAfter: chess.fen() });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Persisted opening-line index (better-sqlite3)
// ---------------------------------------------------------------------------

export function createOpeningIndexTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS opening_lines (
      line_hash TEXT PRIMARY KEY,
      plies     INTEGER NOT NULL,
      freq      INTEGER NOT NULL DEFAULT 0,
      eco       TEXT,
      name      TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);
}

function getMeta(db: Database.Database, key: string): string | undefined {
  try {
    const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value;
  } catch {
    return undefined;
  }
}

function setMeta(db: Database.Database, key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
}

function tableExists(db: Database.Database, name: string): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

/** True once the opening index has been built to completion (a partial build reads false). */
export function isOpeningIndexBuilt(db: Database.Database): boolean {
  return tableExists(db, "opening_lines") && getMeta(db, "opening_index_built") === "true";
}

/** True when the index is missing, incomplete, or was built against a different game count. */
export function isOpeningIndexStale(db: Database.Database, gameCount: number): boolean {
  if (!isOpeningIndexBuilt(db)) return true;
  return getMeta(db, "opening_index_game_count") !== String(gameCount);
}

/** Result of an index build: completed to the end, or aborted partway (resumable). */
export interface OpeningIndexBuildResult {
  completed: boolean;
  processed: number;
  total: number;
}

export interface BuildOpeningIndexOptions {
  identify?: OpeningIdentifier;
  onProgress?: (pct: number, message: string) => void;
  /** Games committed per batch before yielding/throttling. Smaller = smoother UI. */
  batchSize?: number;
  /** Idle delay (ms) between batches to cap CPU. 0 = just yield to the event loop. */
  throttleMs?: number;
  /** Return true to stop cleanly at the next batch boundary (progress is persisted). */
  shouldAbort?: () => boolean;
}

const pause = (ms: number) =>
  new Promise<void>(resolve => (ms > 0 ? setTimeout(resolve, ms) : setImmediate(resolve)));

/**
 * Build (or resume) the opening-line index from the games database. Walks each
 * game's opening, recording every move-prefix hash with its frequency and (when
 * an identifier is supplied) the ECO code/name of the opening reached.
 *
 * Runs in the caller's process but cooperatively and safely:
 *  - `opening_index_built` is cleared at the start and set true only on
 *    completion, so an interrupted build never serves a half-populated index.
 *  - Progress (last processed `game_id`) is committed inside each batch's
 *    transaction, so an app close/crash mid-build resumes from where it stopped
 *    (keyset pagination — no double counting, no slow OFFSET scans).
 *  - `shouldAbort()` is honoured at each batch boundary (e.g. on app quit), and
 *    `throttleMs` idles between batches to keep CPU usage down.
 */
export async function buildOpeningIndex(
  db: Database.Database,
  opts: BuildOpeningIndexOptions = {}
): Promise<OpeningIndexBuildResult> {
  const { identify, onProgress, batchSize = 250, throttleMs = 0, shouldAbort } = opts;
  createOpeningIndexTable(db);

  const total = (db.prepare("SELECT COUNT(*) AS c FROM games").get() as { c: number }).c;

  // A partial index is never "complete" until we finish.
  setMeta(db, "opening_index_built", "false");

  // Resume only when a prior partial build targeted this exact game count.
  const resumable =
    getMeta(db, "opening_index_target") === String(total) &&
    Number(getMeta(db, "opening_index_last_id") || 0) > 0;

  let lastId = resumable ? Number(getMeta(db, "opening_index_last_id")) : 0;
  let processed = resumable ? Number(getMeta(db, "opening_index_progress") || 0) : 0;

  if (!resumable) {
    db.exec("DELETE FROM opening_lines");
    setMeta(db, "opening_index_target", String(total));
    setMeta(db, "opening_index_last_id", "0");
    setMeta(db, "opening_index_progress", "0");
  }

  const upsert = db.prepare(`
    INSERT INTO opening_lines (line_hash, plies, freq, eco, name) VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(line_hash) DO UPDATE SET
      freq = freq + 1,
      eco  = COALESCE(excluded.eco, eco),
      name = COALESCE(excluded.name, name)
  `);
  const select = db.prepare(
    "SELECT game_id, pgn_moves FROM games WHERE game_id > ? ORDER BY game_id LIMIT ?"
  );

  // Rows + progress cursor are committed atomically so a kill between commit and
  // cursor-update can never double-count on resume.
  const applyBatch = db.transaction(
    (rows: Array<{ game_id: number; pgn_moves: string }>, newLastId: number, newProcessed: number) => {
      for (const row of rows) {
        const hasher = new PrefixHasher();
        let ply = 0;
        for (const { uci, fenAfter } of pgnLineToUci(row.pgn_moves)) {
          const key = hasher.push(uci);
          const opening = identify ? identify(fenAfter) : null;
          upsert.run(key, ++ply, opening?.eco ?? null, opening?.name ?? null);
        }
      }
      setMeta(db, "opening_index_last_id", String(newLastId));
      setMeta(db, "opening_index_progress", String(newProcessed));
    }
  );

  for (;;) {
    const rows = select.all(lastId, batchSize) as Array<{ game_id: number; pgn_moves: string }>;
    if (rows.length === 0) break;

    lastId = rows[rows.length - 1].game_id;
    processed += rows.length;
    applyBatch(rows, lastId, processed);

    const pct = total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 100;
    onProgress?.(pct, `Indexing openings… ${processed.toLocaleString()}/${total.toLocaleString()}`);

    if (shouldAbort?.()) return { completed: false, processed, total };
    await pause(throttleMs);
  }

  setMeta(db, "opening_index_built", "true");
  setMeta(db, "opening_index_game_count", String(total));
  onProgress?.(100, "Opening index ready");
  return { completed: true, processed, total };
}

/** How many indexed games followed the exact opening line `uciMoves`. */
export function lineFrequency(db: Database.Database, uciMoves: string[]): number {
  if (!uciMoves.length || !tableExists(db, "opening_lines")) return 0;
  const row = db
    .prepare("SELECT freq FROM opening_lines WHERE line_hash = ?")
    .get(hashLine(uciMoves)) as { freq: number } | undefined;
  return row?.freq ?? 0;
}

/** The opening (eco/name) recorded for the exact line `uciMoves`, if known. */
export function lineOpening(db: Database.Database, uciMoves: string[]): { eco: string; name: string } | null {
  if (!uciMoves.length || !tableExists(db, "opening_lines")) return null;
  const row = db
    .prepare("SELECT eco, name FROM opening_lines WHERE line_hash = ?")
    .get(hashLine(uciMoves)) as { eco: string | null; name: string | null } | undefined;
  if (!row || !row.eco) return null;
  return { eco: row.eco, name: row.name ?? "" };
}

/**
 * Tag each candidate line with a `novel` flag, given the UCI moves already
 * played to reach the current position. Novelty requires a built index and a
 * candidate line still inside the opening window; otherwise nothing is novel.
 */
export function tagNovelLines(
  db: Database.Database | null,
  playedMoves: string[],
  lines: AnalysisLine[]
): AnalysisLine[] {
  if (!db || !isOpeningIndexBuilt(db) || !lines.length) {
    return lines.map(l => ({ ...l, novel: false }));
  }

  // Best line = the strongest evaluation from the side-to-move's perspective.
  const sideSign = playedMoves.length % 2 === 0 ? 1 : -1;
  let bestCp = -Infinity;
  for (const l of lines) {
    const cp = scoreToCp(l.score);
    if (cp !== null) bestCp = Math.max(bestCp, cp * sideSign);
  }

  return lines.map(l => {
    const move = firstMoveOf(l);
    const cp = scoreToCp(l.score);
    if (!move || cp === null || bestCp === -Infinity) return { ...l, novel: false };
    const candidate = [...playedMoves, move];
    if (candidate.length > NOVELTY_MAX_PLIES) return { ...l, novel: false };
    const evalLossCp = bestCp - cp * sideSign;
    const freq = lineFrequency(db, candidate);
    return { ...l, novel: isNovelLine(freq, evalLossCp) };
  });
}
