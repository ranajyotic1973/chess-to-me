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

/** Build extra WHERE conditions and bind args for optional filters.
 *  alias: table alias prefix, e.g. "g" → column refs become "g.result", "g.date" etc. */
function buildExtraConditions(
  params: Pick<GameSearchParams, "result" | "year_from" | "year_to" | "eco" | "minElo" | "opening_name" | "first_move_white" | "first_move_black">,
  alias = ""
): { conditions: string[]; args: (string | number)[] } {
  const p = alias ? `${alias}.` : "";
  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (params.result)                  { conditions.push(`${p}result = ?`);                                          args.push(params.result); }
  if (params.year_from !== undefined) { conditions.push(`CAST(SUBSTR(${p}date,1,4) AS INTEGER) >= ?`);             args.push(params.year_from); }
  if (params.year_to   !== undefined) { conditions.push(`CAST(SUBSTR(${p}date,1,4) AS INTEGER) <= ?`);             args.push(params.year_to); }
  if (params.eco)                     { conditions.push(`${p}eco = ?`);                                             args.push(params.eco); }
  if (params.minElo !== undefined)    { conditions.push(`${p}white_elo >= ?`); conditions.push(`${p}black_elo >= ?`); args.push(params.minElo, params.minElo); }
  if (params.opening_name) {
    const name = params.opening_name.replace(/[%_]/g, "");
    conditions.push(`${p}opening LIKE ?`);
    args.push(`%${name}%`);
  }
  if (params.first_move_white) {
    const mv = params.first_move_white.trim().replace(/[%_]/g, "");
    conditions.push(`(${p}pgn_moves LIKE ? OR ${p}pgn_moves LIKE ?)`);
    args.push(`1. ${mv} %`, `1.${mv} %`);
  }
  if (params.first_move_black) {
    const mv = params.first_move_black.trim().replace(/[%_]/g, "");
    // Matches "1. <any white move> <black move> 2." in standard PGN layout
    conditions.push(`(${p}pgn_moves LIKE ? OR ${p}pgn_moves LIKE ?)`);
    args.push(`1. % ${mv} 2.%`, `1.% ${mv} 2.%`);
  }
  return { conditions, args };
}

export function searchGames(db: Database.Database, params: GameSearchParams): GameRow[] {
  const { player, opponent, result, year_from, year_to, eco, minElo, opening_name, first_move_white, first_move_black, limit = 10 } = params;
  const filterParams = { result, year_from, year_to, eco, minElo, opening_name, first_move_white, first_move_black };

  // Two-player search: find games where both players appear on either side
  if (player && opponent) {
    const pp = `%${player.replace(/[%_]/g, "")}%`;
    const op = `%${opponent.replace(/[%_]/g, "")}%`;
    const { conditions: extra, args: extraArgs } = buildExtraConditions(filterParams);
    const where = [
      "(white LIKE ? OR black LIKE ?)",
      "(white LIKE ? OR black LIKE ?)",
      ...extra
    ].join(" AND ");
    return db.prepare(
      `SELECT * FROM games WHERE ${where} ORDER BY date DESC LIMIT ?`
    ).all(pp, pp, op, op, ...extraArgs, limit) as GameRow[];
  }

  // Single-player FTS search
  if (player) {
    const ftsQuery = player.trim().split(/\s+/).map(t => `"${t}"`).join(" OR ");
    const { conditions: ftsExtra, args: ftsExtraArgs } = buildExtraConditions(filterParams, "g");
    const ftsWhere = ftsExtra.map(c => `AND ${c}`).join(" ");
    try {
      return db.prepare(`
        SELECT g.* FROM games_fts f
        JOIN games g ON g.game_id = f.rowid
        WHERE games_fts MATCH ?
        ${ftsWhere}
        ORDER BY g.date DESC LIMIT ?
      `).all(ftsQuery, ...ftsExtraArgs, limit) as GameRow[];
    } catch {
      // FTS not yet built — fall through to LIKE
      const pp = `%${player.replace(/[%_]/g, "")}%`;
      const { conditions: likeExtra, args: likeExtraArgs } = buildExtraConditions(filterParams);
      const likeWhere = ["(white LIKE ? OR black LIKE ?)", ...likeExtra].join(" AND ");
      return db.prepare(
        `SELECT * FROM games WHERE ${likeWhere} ORDER BY date DESC LIMIT ?`
      ).all(pp, pp, ...likeExtraArgs, limit) as GameRow[];
    }
  }

  // No player specified — filter by result / year / eco / elo only
  const { conditions: extra, args: extraArgs } = buildExtraConditions(filterParams);
  const where = extra.length ? `WHERE ${extra.join(" AND ")}` : "";
  return db.prepare(
    `SELECT * FROM games ${where} ORDER BY date DESC LIMIT ?`
  ).all(...extraArgs, limit) as GameRow[];
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
