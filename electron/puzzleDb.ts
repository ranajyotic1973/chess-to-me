import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { PuzzleRow, PuzzleSearchParams } from "../src/types";

// Map user-friendly keywords to Lichess theme names stored in the DB
const THEME_ALIASES: Record<string, string> = {
  // Mate patterns
  "mate in 1": "mateIn1",
  "mate in 2": "mateIn2",
  "mate in 3": "mateIn3",
  "mate in 4": "mateIn4",
  "mate in 5": "mateIn5",
  "checkmate in 1": "mateIn1",
  "checkmate in 2": "mateIn2",
  "checkmate in 3": "mateIn3",
  "checkmate in 4": "mateIn4",
  "checkmate in 5": "mateIn5",
  "smothered mate": "smotheredMate",
  "back rank mate": "backRankMate",
  "back rank": "backRankMate",
  "arabian mate": "arabianMate",
  "anastasia mate": "anastasiaMate",
  "boden mate": "bodensMate",
  // Tactics
  "fork": "fork",
  "pin": "pin",
  "skewer": "skewer",
  "discovered attack": "discoveredAttack",
  "discovery": "discoveredAttack",
  "double check": "doubleCheck",
  "zwischenzug": "zwischenzug",
  "in between move": "zwischenzug",
  "interference": "interference",
  "intermezzo": "zwischenzug",
  "attraction": "attraction",
  "deflection": "deflection",
  "clearance": "clearance",
  "sacrifice": "sacrifice",
  "zugzwang": "zugzwang",
  "quiet move": "quietMove",
  "underpromotion": "underPromotion",
  "under promotion": "underPromotion",
  "promotion": "promotion",
  // Phase
  "endgame": "endgame",
  "end game": "endgame",
  "middlegame": "middlegame",
  "middle game": "middlegame",
  "opening": "opening",
  // Evaluation
  "winning": "crushing",
  "crushing": "crushing",
  "advantage": "advantage",
  "equal": "equality",
};

export function normalizeThemeKeyword(keyword: string): string {
  const lower = keyword.trim().toLowerCase();
  return THEME_ALIASES[lower] ?? keyword;
}

export function initPuzzleDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS puzzles (
      puzzle_id    TEXT PRIMARY KEY,
      fen          TEXT NOT NULL,
      moves        TEXT NOT NULL,
      rating       INTEGER,
      rating_deviation INTEGER,
      popularity   INTEGER,
      nb_plays     INTEGER,
      themes       TEXT,
      game_url     TEXT,
      opening_tags TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(rating);
    CREATE INDEX IF NOT EXISTS idx_popularity ON puzzles(popularity);

    CREATE VIRTUAL TABLE IF NOT EXISTS puzzles_fts
      USING fts5(puzzle_id UNINDEXED, themes, opening_tags, content=puzzles, content_rowid=rowid);
  `);

  return db;
}

export function importPuzzlesFromCsv(
  db: Database.Database,
  csvBuffer: Buffer,
  onProgress: (pct: number) => void
): number {
  const total = csvBuffer.length;
  let imported = 0;
  let lastReported = 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO puzzles
      (puzzle_id, fen, moves, rating, rating_deviation, popularity, nb_plays, themes, game_url, opening_tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT OR REPLACE INTO puzzles_fts(puzzle_id, themes, opening_tags)
    VALUES (?, ?, ?)
  `);

  const insertBatch = db.transaction((batch: string[][]) => {
    for (const cols of batch) {
      if (cols.length < 9) continue;
      const [puzzle_id, fen, moves, rating, rd, pop, plays, themes, game_url, opening_tags = ""] = cols;
      insert.run(puzzle_id, fen, moves, parseInt(rating) || 0, parseInt(rd) || 0,
        parseInt(pop) || 0, parseInt(plays) || 0, themes, game_url, opening_tags);
      insertFts.run(puzzle_id, themes, opening_tags);
      imported++;
    }
  });

  const BATCH_SIZE = 1000;
  let batch: string[][] = [];
  let firstLine = true;
  let offset = 0;

  // Scan the buffer line-by-line — never materialise the whole thing as a string
  while (offset < total) {
    let end = csvBuffer.indexOf(0x0a, offset); // 0x0a = '\n'
    if (end === -1) end = total;

    // Strip trailing \r for Windows-style line endings
    const lineEnd = end > offset && csvBuffer[end - 1] === 0x0d ? end - 1 : end;

    if (lineEnd > offset) {
      const line = csvBuffer.subarray(offset, lineEnd).toString("utf8");
      if (firstLine) {
        firstLine = false; // skip CSV header
      } else {
        const cols = parseCSVLine(line);
        batch.push(cols);

        if (batch.length >= BATCH_SIZE) {
          insertBatch(batch);
          batch = [];
          const pct = Math.min(99, Math.floor((offset / total) * 100));
          if (pct >= lastReported + 5) {
            onProgress(pct);
            lastReported = pct;
          }
        }
      }
    }

    offset = end + 1;
  }

  if (batch.length > 0) insertBatch(batch);
  onProgress(100);
  return imported;
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

export function hasPuzzles(db: Database.Database): boolean {
  try {
    const row = db.prepare("SELECT 1 FROM puzzles LIMIT 1").get();
    return row !== undefined;
  } catch {
    return false;
  }
}

export function searchPuzzles(db: Database.Database, params: PuzzleSearchParams): PuzzleRow[] {
  const { theme, minRating, maxRating, opening, limit = 5 } = params;
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (minRating !== undefined) { conditions.push("rating >= ?"); args.push(minRating); }
  if (maxRating !== undefined) { conditions.push("rating <= ?"); args.push(maxRating); }
  if (theme) {
    const normalized = normalizeThemeKeyword(theme);
    conditions.push("themes LIKE ?");
    args.push(`%${normalized}%`);
  }
  if (opening) { conditions.push("opening_tags LIKE ?"); args.push(`%${opening}%`); }

  // Only return puzzles with reasonable popularity
  conditions.push("popularity > -50");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM puzzles ${where} ORDER BY RANDOM() LIMIT ?`;
  args.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...args) as PuzzleRow[];
}

export function getPuzzleDbStats(dbPath: string): { count: number; sizeBytes: number } | null {
  if (!fs.existsSync(dbPath)) return null;
  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM puzzles").get() as { cnt: number };
    db.close();
    const sizeBytes = fs.statSync(dbPath).size;
    return { count: row.cnt, sizeBytes };
  } catch {
    return null;
  }
}

export function extractAndStoreThemes(db: Database.Database, cacheDir: string): void {
  try {
    // Query all unique themes from the database
    const rows = db.prepare("SELECT DISTINCT themes FROM puzzles WHERE themes IS NOT NULL").all() as Array<{ themes: string }>;
    const themeSet = new Set<string>();

    for (const row of rows) {
      if (row.themes) {
        // Themes are space-separated in Lichess format
        const themes = row.themes.split(" ");
        themes.forEach(t => { if (t.trim()) themeSet.add(t.trim()); });
      }
    }

    const uniqueThemes = Array.from(themeSet).sort();

    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Store themes as JSON for LLM reference
    const themesPath = path.join(cacheDir, "puzzle-themes.json");
    fs.writeFileSync(themesPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      count: uniqueThemes.length,
      themes: uniqueThemes
    }, null, 2), "utf-8");

    console.log(`[DB] Extracted and cached ${uniqueThemes.length} unique themes to ${themesPath}`);
  } catch (err) {
    console.warn("[DB] Failed to extract themes:", (err as Error).message);
  }
}
