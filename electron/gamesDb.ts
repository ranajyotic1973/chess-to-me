import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { GameRow, GameSearchParams } from "../src/types";

export function initGamesDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      game_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      white      TEXT    NOT NULL DEFAULT '',
      black      TEXT    NOT NULL DEFAULT '',
      result     TEXT    NOT NULL DEFAULT '',
      white_elo  INTEGER NOT NULL DEFAULT 0,
      black_elo  INTEGER NOT NULL DEFAULT 0,
      eco        TEXT    NOT NULL DEFAULT '',
      opening    TEXT    NOT NULL DEFAULT '',
      date       TEXT    NOT NULL DEFAULT '',
      event      TEXT    NOT NULL DEFAULT '',
      pgn_moves  TEXT    NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_white     ON games(white);
    CREATE INDEX IF NOT EXISTS idx_black     ON games(black);
    CREATE INDEX IF NOT EXISTS idx_eco       ON games(eco);
    CREATE INDEX IF NOT EXISTS idx_white_elo ON games(white_elo);
    CREATE INDEX IF NOT EXISTS idx_black_elo ON games(black_elo);

    CREATE VIRTUAL TABLE IF NOT EXISTS games_fts USING fts5(
      white, black, opening, event,
      content='games',
      content_rowid='game_id'
    );

    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  // Rebuild FTS index if the bundled DB shipped without it (fts_built != 'true')
  const ftsMeta = db.prepare("SELECT value FROM meta WHERE key = 'fts_built'").get() as { value: string } | undefined;
  if (!ftsMeta || ftsMeta.value !== "true") {
    console.log("[DB] Rebuilding FTS index (first launch)…");
    db.exec("INSERT INTO games_fts(games_fts) VALUES('rebuild')");
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('fts_built', 'true')").run();
    console.log("[DB] FTS rebuild complete.");
  }

  return db;
}

export function rebuildFts(db: Database.Database): void {
  db.exec("INSERT INTO games_fts(games_fts) VALUES('rebuild')");
}

interface ParsedGame {
  white: string;
  black: string;
  result: string;
  white_elo: number;
  black_elo: number;
  eco: string;
  opening: string;
  date: string;
  event: string;
  pgn_moves: string;
}

function parsePgn(pgn: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const chunks = pgn.split(/\n\n(?=\[Event)/);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const headers: Record<string, string> = {};
    const headerPattern = /\[(\w+)\s+"([^"]*)"\]/g;
    let m: RegExpExecArray | null;
    while ((m = headerPattern.exec(chunk)) !== null) {
      headers[m[1]] = m[2];
    }
    const movesMatch = chunk.match(/\]\s*\n+([\s\S]+)$/);
    const pgn_moves = movesMatch ? movesMatch[1].trim() : "";
    if (!headers["White"] || !headers["Black"]) continue;

    games.push({
      white:     headers["White"]    || "",
      black:     headers["Black"]    || "",
      result:    headers["Result"]   || "*",
      white_elo: parseInt(headers["WhiteElo"] || "0") || 0,
      black_elo: parseInt(headers["BlackElo"] || "0") || 0,
      eco:       headers["ECO"]      || "",
      opening:   headers["Opening"]  || "",
      date:      headers["Date"]     || "",
      event:     headers["Event"]    || "",
      pgn_moves
    });
  }
  return games;
}

// Stream-import a PGN file line-by-line (handles files > 512 MB safely)
export async function importPgnFile(
  db: Database.Database,
  filePath: string,
  onProgress?: (count: number) => void
): Promise<number> {
  const insert = db.prepare(`
    INSERT INTO games (white, black, result, white_elo, black_elo, eco, opening, date, event, pgn_moves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const BATCH = 500;
  let headers: Record<string, string> = {};
  let moveParts: string[] = [];
  let batch: Parameters<typeof insert.run>[] = [];
  let total = 0;
  let inMoves = false;

  const flushBatch = () => {
    if (batch.length === 0) return;
    db.transaction((rows: typeof batch) => { for (const r of rows) insert.run(...r); })(batch);
    total += batch.length;
    batch = [];
    onProgress?.(total);
  };

  const commitGame = () => {
    if (!headers["White"] || !headers["Black"]) { headers = {}; moveParts = []; return; }
    batch.push([
      headers["White"] || "", headers["Black"] || "", headers["Result"] || "*",
      parseInt(headers["WhiteElo"] || "0") || 0, parseInt(headers["BlackElo"] || "0") || 0,
      headers["ECO"] || "", headers["Opening"] || "", headers["Date"] || "",
      headers["Event"] || "", moveParts.join(" ").trim()
    ]);
    headers = {}; moveParts = [];
    if (batch.length >= BATCH) flushBatch();
  };

  await new Promise<void>((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (t.startsWith("[")) {
        if (inMoves) { commitGame(); inMoves = false; }
        const m = t.match(/^\[(\w+)\s+"([^"]*)"\]$/);
        if (m) headers[m[1]] = m[2];
      } else if (t === "") {
        if (inMoves) { commitGame(); inMoves = false; }
      } else {
        inMoves = true;
        moveParts.push(t);
      }
    });
    rl.on("close", () => {
      if (inMoves || (headers["White"] && headers["Black"])) commitGame();
      flushBatch();
      resolve();
    });
    rl.on("error", reject);
  });

  return total;
}

export function importPgnText(db: Database.Database, pgnText: string): number {
  const insert = db.prepare(`
    INSERT INTO games (white, black, result, white_elo, black_elo, eco, opening, date, event, pgn_moves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const games = parsePgn(pgnText);
  db.transaction((batch: ParsedGame[]) => {
    for (const g of batch) {
      insert.run(g.white, g.black, g.result, g.white_elo, g.black_elo,
        g.eco, g.opening, g.date, g.event, g.pgn_moves);
    }
  })(games);
  return games.length;
}

export function searchGames(db: Database.Database, params: GameSearchParams): GameRow[] {
  const { player, eco, minElo, limit = 10 } = params;

  // Use FTS5 when searching by player name or opening text
  if (player) {
    const ftsQuery = player.trim().split(/\s+/).map(t => `"${t}"`).join(" OR ");
    const sql = `
      SELECT g.* FROM games_fts f
      JOIN games g ON g.game_id = f.rowid
      WHERE games_fts MATCH ?
        ${eco       ? "AND g.eco = ?"                                        : ""}
        ${minElo !== undefined ? "AND g.white_elo >= ? AND g.black_elo >= ?" : ""}
      LIMIT ?
    `;
    const args: (string | number)[] = [ftsQuery];
    if (eco)             args.push(eco);
    if (minElo !== undefined) args.push(minElo, minElo);
    args.push(limit);
    try {
      return db.prepare(sql).all(...args) as GameRow[];
    } catch {
      // FTS not yet built — fall through to plain query
    }
  }

  // Plain indexed query (eco / elo filters without text)
  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (eco)  { conditions.push("eco = ?"); args.push(eco); }
  if (minElo !== undefined) {
    conditions.push("white_elo >= ? AND black_elo >= ?");
    args.push(minElo, minElo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM games ${where} ORDER BY RANDOM() LIMIT ?`;
  args.push(limit);
  return db.prepare(sql).all(...args) as GameRow[];
}

export function getGamesDbStats(dbPath: string): { count: number; sizeBytes: number; source: string } | null {
  if (!fs.existsSync(dbPath)) return null;
  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM games").get() as { cnt: number };
    // Read source tag if stored
    let source = "Lumbra's Gigabase";
    try {
      const meta = db.prepare("SELECT value FROM meta WHERE key = 'source'").get() as { value: string } | undefined;
      if (meta) source = meta.value;
    } catch { /* meta table may not exist yet */ }
    db.close();
    return { count: row.cnt, sizeBytes: fs.statSync(dbPath).size, source };
  } catch {
    return null;
  }
}

export function setGamesSource(db: Database.Database, source: string): void {
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('source', ?)").run(source);
}
