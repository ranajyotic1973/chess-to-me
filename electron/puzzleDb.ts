import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { PuzzleRow, PuzzleSearchParams } from "../src/types";

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
  csvText: string,
  onProgress: (pct: number) => void
): number {
  const lines = csvText.split("\n");
  const total = lines.length;
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

  for (let i = 0; i < total; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (firstLine) { firstLine = false; continue; } // skip CSV header

    const cols = parseCSVLine(line);
    batch.push(cols);

    if (batch.length >= BATCH_SIZE) {
      insertBatch(batch);
      batch = [];
      const pct = Math.floor((i / total) * 100);
      if (pct >= lastReported + 5) {
        onProgress(pct);
        lastReported = pct;
      }
    }
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

export function searchPuzzles(db: Database.Database, params: PuzzleSearchParams): PuzzleRow[] {
  const { theme, minRating, maxRating, opening, limit = 5 } = params;
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (minRating !== undefined) { conditions.push("rating >= ?"); args.push(minRating); }
  if (maxRating !== undefined) { conditions.push("rating <= ?"); args.push(maxRating); }
  if (theme) { conditions.push("themes LIKE ?"); args.push(`%${theme}%`); }
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
