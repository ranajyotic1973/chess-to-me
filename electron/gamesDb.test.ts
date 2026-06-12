import Database from "better-sqlite3";
import { searchGames } from "./gamesDb";
import type { GameRow } from "../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE games (
      game_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      white      TEXT NOT NULL DEFAULT '',
      black      TEXT NOT NULL DEFAULT '',
      result     TEXT NOT NULL DEFAULT '',
      white_elo  INTEGER NOT NULL DEFAULT 0,
      black_elo  INTEGER NOT NULL DEFAULT 0,
      eco        TEXT NOT NULL DEFAULT '',
      opening    TEXT NOT NULL DEFAULT '',
      date       TEXT NOT NULL DEFAULT '',
      event      TEXT NOT NULL DEFAULT '',
      pgn_moves  TEXT NOT NULL DEFAULT ''
    );
    CREATE VIRTUAL TABLE games_fts USING fts5(
      white, black, opening, event,
      content='games',
      content_rowid='game_id'
    );
  `);
  return db;
}

function insert(db: Database.Database, game: Partial<GameRow> & { white: string; black: string; result: string }): void {
  const info = db.prepare(`
    INSERT INTO games (white, black, result, white_elo, black_elo, eco, opening, date, event, pgn_moves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    game.white, game.black, game.result,
    game.white_elo ?? 0, game.black_elo ?? 0,
    game.eco ?? "", game.opening ?? "", game.date ?? "????.??.??",
    game.event ?? "", game.pgn_moves ?? ""
  );
  const id = info.lastInsertRowid as number;
  db.prepare(`INSERT INTO games_fts(rowid, white, black, opening, event) VALUES (?, ?, ?, ?, ?)`)
    .run(id, game.white, game.black, game.opening ?? "", game.event ?? "");
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

let db: Database.Database;

beforeEach(() => {
  db = makeDb();
  insert(db, { white: "Kasparov, Garry",   black: "Karpov, Anatoly",  result: "1-0",     date: "1985.09.01", eco: "B85" });
  insert(db, { white: "Karpov, Anatoly",   black: "Kasparov, Garry",  result: "0-1",     date: "1986.10.03" });
  insert(db, { white: "Kasparov, Garry",   black: "Karpov, Anatoly",  result: "1/2-1/2", date: "1986.11.05" });
  insert(db, { white: "Carlsen, Magnus",   black: "Caruana, Fabiano", result: "1/2-1/2", date: "2018.11.28" });
  insert(db, { white: "Tal, Mikhail",      black: "Botvinnik, Mikhail", result: "1-0",   date: "1960.03.15" });
  insert(db, { white: "Botvinnik, Mikhail", black: "Tal, Mikhail",    result: "0-1",     date: "1960.04.20" });
});

afterEach(() => db.close());

// ---------------------------------------------------------------------------
// Single-player FTS search
// ---------------------------------------------------------------------------

describe("searchGames — single-player search", () => {
  test("finds games by last name (FTS)", () => {
    const rows = searchGames(db, { player: "Kasparov", limit: 10 });
    expect(rows).toHaveLength(3);
  });

  test("finds games by partial name", () => {
    const rows = searchGames(db, { player: "Carlsen", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].white).toBe("Carlsen, Magnus");
  });

  test("returns empty when no match", () => {
    const rows = searchGames(db, { player: "Fischer", limit: 10 });
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// result filter
// ---------------------------------------------------------------------------

describe("searchGames — result filter", () => {
  test("filters to white wins only", () => {
    const rows = searchGames(db, { player: "Kasparov", result: "1-0", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("1-0");
    expect(rows[0].white).toBe("Kasparov, Garry");
  });

  test("filters to draws only", () => {
    const rows = searchGames(db, { player: "Kasparov", result: "1/2-1/2", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("1/2-1/2");
  });

  test("filters black wins", () => {
    const rows = searchGames(db, { player: "Kasparov", result: "0-1", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("0-1");
  });
});

// ---------------------------------------------------------------------------
// year_from / year_to filters
// ---------------------------------------------------------------------------

describe("searchGames — year filters", () => {
  test("year_from excludes earlier games", () => {
    const rows = searchGames(db, { player: "Kasparov", year_from: 1986, limit: 10 });
    expect(rows.every(r => r.date >= "1986")).toBe(true);
    expect(rows).toHaveLength(2);
  });

  test("year_to excludes later games", () => {
    const rows = searchGames(db, { player: "Kasparov", year_to: 1985, limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("1985.09.01");
  });

  test("year_from + year_to narrows to a single year", () => {
    const rows = searchGames(db, { player: "Tal", year_from: 1960, year_to: 1960, limit: 10 });
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.date.startsWith("1960"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Two-player (opponent) search
// ---------------------------------------------------------------------------

describe("searchGames — two-player search", () => {
  test("finds games where both players appear", () => {
    const rows = searchGames(db, { player: "Kasparov", opponent: "Karpov", limit: 10 });
    expect(rows).toHaveLength(3);
  });

  test("order is irrelevant — Karpov vs Kasparov same result", () => {
    const rows = searchGames(db, { player: "Karpov", opponent: "Kasparov", limit: 10 });
    expect(rows).toHaveLength(3);
  });

  test("two-player + result filter", () => {
    const rows = searchGames(db, { player: "Kasparov", opponent: "Karpov", result: "1-0", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].white).toBe("Kasparov, Garry");
    expect(rows[0].result).toBe("1-0");
  });

  test("two-player + year range", () => {
    const rows = searchGames(db, { player: "Kasparov", opponent: "Karpov", year_from: 1986, year_to: 1986, limit: 10 });
    expect(rows).toHaveLength(2);
  });

  test("two-player returns empty when no match", () => {
    const rows = searchGames(db, { player: "Carlsen", opponent: "Kasparov", limit: 10 });
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// No-player (fallback) search
// ---------------------------------------------------------------------------

describe("searchGames — no player", () => {
  test("returns all games up to limit when no filters given", () => {
    const rows = searchGames(db, { limit: 3 });
    expect(rows).toHaveLength(3);
  });

  test("result-only filter works without player", () => {
    const rows = searchGames(db, { result: "1-0", limit: 10 });
    expect(rows.every(r => r.result === "1-0")).toBe(true);
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// limit
// ---------------------------------------------------------------------------

describe("searchGames — limit", () => {
  test("respects the limit parameter", () => {
    const rows = searchGames(db, { player: "Kasparov", limit: 2 });
    expect(rows).toHaveLength(2);
  });

  test("default limit is 10", () => {
    // Insert 12 Kasparov games
    for (let i = 0; i < 9; i++) {
      insert(db, { white: "Kasparov, Garry", black: "Extra, Player", result: "1-0", date: `199${i}.01.01` });
    }
    const rows = searchGames(db, { player: "Kasparov" });
    expect(rows.length).toBeLessThanOrEqual(10);
  });
});
