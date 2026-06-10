#!/usr/bin/env node
/**
 * One-time pre-build: imports the Lumbra's Gigabase 7z into data/games/games.db
 * so it can be bundled with the installer.
 *
 * Uses sql.js (pure WASM) to avoid native module compilation issues.
 * Output is a standard SQLite file fully compatible with better-sqlite3.
 *
 * Usage:
 *   node scripts/build-games-db.js "C:\Users\ranaj\Downloads\LumbrasGigaBase_OTB_Elite_ELO2400.7z"
 *
 * Output: data/games/games.db  (gitignored, bundled by electron-builder)
 */

const path     = require("path");
const fs       = require("fs");
const readline = require("readline");
const Seven    = require("node-7z");
const { path7za } = require("7zip-bin");

const root       = path.join(__dirname, "..");
const destDir    = path.join(root, "data", "games");
const dbPath     = path.join(destDir, "games.db");
const extractDir = path.join(destDir, "extracted");

const archivePath = process.argv[2];
if (!archivePath) {
  console.error("Usage: node scripts/build-games-db.js <path-to-7z-or-pgn-file>");
  process.exit(1);
}
if (!fs.existsSync(archivePath)) {
  console.error(`File not found: ${archivePath}`);
  process.exit(1);
}

async function run() {
  // ── load sql.js ─────────────────────────────────────────────────────────
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  // ── extract 7z if needed ─────────────────────────────────────────────────
  let pgnFiles = [];

  if (archivePath.toLowerCase().endsWith(".7z")) {
    if (!fs.existsSync(destDir))    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

    console.log(`Extracting ${path.basename(archivePath)} …`);

    await new Promise((resolve, reject) => {
      const stream = Seven.extractFull(archivePath, extractDir, {
        $bin: path7za,
        $progress: true,
        overwrite: "a",
      });
      let lastPct = -1;
      stream.on("progress", (p) => {
        const pct = p.percent ?? 0;
        if (pct !== lastPct) {
          process.stdout.write(`\r  Extraction: ${pct}%   `);
          lastPct = pct;
        }
      });
      stream.on("end",   resolve);
      stream.on("error", reject);
    });
    console.log("\nExtraction complete.");

    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.toLowerCase().endsWith(".pgn")) pgnFiles.push(full);
      }
    };
    walk(extractDir);
  } else if (archivePath.toLowerCase().endsWith(".pgn")) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    pgnFiles = [archivePath];
  } else {
    console.error("Unsupported file type. Please provide a .7z or .pgn file.");
    process.exit(1);
  }

  if (pgnFiles.length === 0) {
    console.error("No PGN files found.");
    process.exit(1);
  }
  console.log(`Found ${pgnFiles.length} PGN file(s).`);

  // ── create SQLite DB in memory ───────────────────────────────────────────
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("Removed existing games.db.");
  }

  const db = new SQL.Database();
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run(`
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
    )
  `);
  db.run("CREATE INDEX IF NOT EXISTS idx_white     ON games(white)");
  db.run("CREATE INDEX IF NOT EXISTS idx_black     ON games(black)");
  db.run("CREATE INDEX IF NOT EXISTS idx_eco       ON games(eco)");
  db.run("CREATE INDEX IF NOT EXISTS idx_white_elo ON games(white_elo)");
  db.run("CREATE INDEX IF NOT EXISTS idx_black_elo ON games(black_elo)");
  // FTS5 is NOT created here (sql.js WASM omits it).
  // initGamesDb() in the app creates the FTS5 virtual table and rebuilds the
  // index on first launch after the bundled DB is copied to userData.
  db.run("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");

  // ── streaming PGN import ─────────────────────────────────────────────────
  // Reads line-by-line to handle files larger than V8's max string size.
  const insertSql = `
    INSERT INTO games (white, black, result, white_elo, black_elo, eco, opening, date, event, pgn_moves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const stmt = db.prepare(insertSql);

  const BATCH_SIZE = 500;

  async function importPgnFileStreaming(filePath) {
    let fileGames = 0;
    let headers   = {};
    let moveParts = [];
    let batch     = [];

    const flushBatch = () => {
      if (batch.length === 0) return;
      db.run("BEGIN");
      for (const g of batch) {
        stmt.run([g.white, g.black, g.result, g.white_elo, g.black_elo,
                  g.eco, g.opening, g.date, g.event, g.pgn_moves]);
      }
      db.run("COMMIT");
      fileGames  += batch.length;
      totalGames += batch.length;
      batch = [];
    };

    const commitGame = () => {
      if (!headers["White"] || !headers["Black"]) { headers = {}; moveParts = []; return; }
      batch.push({
        white:     headers["White"]   || "",
        black:     headers["Black"]   || "",
        result:    headers["Result"]  || "*",
        white_elo: parseInt(headers["WhiteElo"] || "0") || 0,
        black_elo: parseInt(headers["BlackElo"] || "0") || 0,
        eco:       headers["ECO"]     || "",
        opening:   headers["Opening"] || "",
        date:      headers["Date"]    || "",
        event:     headers["Event"]   || "",
        pgn_moves: moveParts.join(" ").trim()
      });
      headers   = {};
      moveParts = [];
      if (batch.length >= BATCH_SIZE) {
        flushBatch();
        if (fileGames % 50000 === 0) {
          process.stdout.write(`\r  ${path.basename(filePath)}: ${fileGames.toLocaleString()} games (total: ${totalGames.toLocaleString()})   `);
        }
      }
    };

    await new Promise((resolve, reject) => {
      const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
      let inMoves = false;

      rl.on("line", (line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("[")) {
          // Header tag
          if (inMoves) { commitGame(); inMoves = false; }
          const m = trimmed.match(/^\[(\w+)\s+"([^"]*)"\]$/);
          if (m) headers[m[1]] = m[2];
        } else if (trimmed === "") {
          if (inMoves) { commitGame(); inMoves = false; }
          // else: blank line before moves — stay in header state
        } else {
          // Moves line
          inMoves = true;
          moveParts.push(trimmed);
        }
      });

      rl.on("close", () => {
        if (inMoves || (headers["White"] && headers["Black"])) commitGame();
        flushBatch();
        resolve();
      });
      rl.on("error", reject);
    });

    return fileGames;
  }

  let totalGames = 0;

  for (let fi = 0; fi < pgnFiles.length; fi++) {
    console.log(`\nStreaming ${path.basename(pgnFiles[fi])} …`);
    const count = await importPgnFileStreaming(pgnFiles[fi]);
    console.log(`\n  Done: ${count.toLocaleString()} games`);
  }
  stmt.free();
  console.log(`\nAll games inserted: ${totalGames.toLocaleString()} total.`);

  // ── metadata ──────────────────────────────────────────────────────────────
  db.run("INSERT OR REPLACE INTO meta VALUES ('source', ?)", ["Lumbra's Gigabase OTB Elite"]);
  db.run("INSERT OR REPLACE INTO meta VALUES ('base_import_date', ?)", [new Date().toISOString().slice(0, 10)]);
  db.run("INSERT OR REPLACE INTO meta VALUES ('fts_built', ?)", ["false"]);

  // ── write DB to disk ──────────────────────────────────────────────────────
  console.log(`Writing games.db to disk…`);
  const data = db.export();
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  // ── clean up extracted files ──────────────────────────────────────────────
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
    console.log("Cleaned up extracted files.");
  }

  const sizeMB = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(0);
  console.log(`\nDone!`);
  console.log(`  Output: ${dbPath} (${sizeMB} MB)`);
  console.log(`  Games:  ${totalGames.toLocaleString()}`);
  console.log(`\nNext step: npm run dist:win  (games.db will be bundled automatically)`);
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
