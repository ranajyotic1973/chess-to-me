import Database from "better-sqlite3";
import {
  hashLine,
  isNovelLine,
  scoreToCp,
  firstMoveOf,
  pgnLineToUci,
  createOpeningIndexTable,
  buildOpeningIndex,
  lineFrequency,
  lineOpening,
  isOpeningIndexBuilt,
  isOpeningIndexStale,
  tagNovelLines,
  NOVELTY_FREQ_FLOOR,
  NOVELTY_EVAL_CP
} from "./noveltyIndex";
import type { AnalysisLine } from "../src/types";

describe("hashLine", () => {
  test("is stable and prefix-sensitive", () => {
    expect(hashLine(["e2e4", "e7e5"])).toBe(hashLine(["e2e4", "e7e5"]));
    expect(hashLine(["e2e4"])).not.toBe(hashLine(["e2e4", "e7e5"]));
    expect(hashLine(["e2e4", "e7e5"])).not.toBe(hashLine(["e7e5", "e2e4"]));
  });
});

describe("isNovelLine predicate", () => {
  test("rare AND sound → novel", () => {
    expect(isNovelLine(NOVELTY_FREQ_FLOOR - 1, NOVELTY_EVAL_CP - 1)).toBe(true);
    expect(isNovelLine(0, 0)).toBe(true);
  });
  test("frequently played → not novel", () => {
    expect(isNovelLine(NOVELTY_FREQ_FLOOR + 10, 0)).toBe(false);
    expect(isNovelLine(NOVELTY_FREQ_FLOOR, 0)).toBe(false); // at floor, not below
  });
  test("rare but unsound → not novel", () => {
    expect(isNovelLine(0, NOVELTY_EVAL_CP + 100)).toBe(false);
  });
});

describe("scoreToCp / firstMoveOf", () => {
  test("scoreToCp handles cp, mate, winProb, null", () => {
    expect(scoreToCp({ type: "cp", value: 120 })).toBe(120);
    expect(scoreToCp({ type: "mate", value: 3 })).toBeGreaterThan(9000);
    expect(scoreToCp({ type: "mate", value: -3 })).toBeLessThan(-9000);
    expect(scoreToCp({ winProb: 0.5 })).toBe(0);
    expect(scoreToCp(null)).toBeNull();
  });
  test("firstMoveOf extracts the first UCI token", () => {
    expect(firstMoveOf({ score: null, pv: "e2e4 e7e5 g1f3" })).toBe("e2e4");
    expect(firstMoveOf({ score: null, pv: "" })).toBeNull();
  });
});

describe("pgnLineToUci", () => {
  test("replays SAN into UCI with the position after each move", () => {
    const moves = pgnLineToUci("1. e4 e5 2. Nf3 Nc6 1-0");
    expect(moves.map(m => m.uci)).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
    // After 1.e4 the e-pawn stands on e4, Black still to move.
    expect(moves[0].fenAfter.startsWith("rnbqkbnr/pppppppp/8/8/4P3")).toBe(true);
    expect(moves[1].fenAfter.startsWith("rnbqkbnr/pppp1ppp")).toBe(true);
  });
  test("stops cleanly on an illegal/garbled move", () => {
    expect(pgnLineToUci("1. e4 e5 2. Zz9 Nc6").length).toBe(2);
  });
  test("honours the ply cap", () => {
    expect(pgnLineToUci("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6", 3).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Persisted index against an in-memory database
// ---------------------------------------------------------------------------

function makeGamesDb(pgns: string[]): Database.Database {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE games (game_id INTEGER PRIMARY KEY AUTOINCREMENT, pgn_moves TEXT NOT NULL DEFAULT '');`);
  const insert = db.prepare("INSERT INTO games (pgn_moves) VALUES (?)");
  for (const p of pgns) insert.run(p);
  return db;
}

describe("buildOpeningIndex + lineFrequency", () => {
  test("counts line-prefix frequencies across games", async () => {
    // Three games open 1.e4 e5, one opens 1.d4 d5.
    const db = makeGamesDb([
      "1. e4 e5 2. Nf3",
      "1. e4 e5 2. Bc4",
      "1. e4 e5",
      "1. d4 d5"
    ]);
    await buildOpeningIndex(db);

    expect(lineFrequency(db, ["e2e4"])).toBe(3);        // three games played 1.e4
    expect(lineFrequency(db, ["e2e4", "e7e5"])).toBe(3); // all three continued ...e5
    expect(lineFrequency(db, ["e2e4", "e7e5", "g1f3"])).toBe(1);
    expect(lineFrequency(db, ["d2d4"])).toBe(1);
    expect(lineFrequency(db, ["g1f3"])).toBe(0);

    expect(isOpeningIndexBuilt(db)).toBe(true);
    expect(isOpeningIndexStale(db, 4)).toBe(false);
    expect(isOpeningIndexStale(db, 99)).toBe(true);
    db.close();
  });

  test("records ECO code/name via the injected identifier", async () => {
    const db = makeGamesDb(["1. e4 e5 2. Nf3"]);
    // Fake identifier: label the line after 1.e4 e5.
    const identify = (fen: string) =>
      fen.startsWith("rnbqkbnr/pppp1ppp/8/4p3/4P3") ? { eco: "C20", name: "King's Pawn Game" } : null;
    await buildOpeningIndex(db, { identify });

    expect(lineOpening(db, ["e2e4", "e7e5"])).toEqual({ eco: "C20", name: "King's Pawn Game" });
    expect(lineOpening(db, ["e2e4"])).toBeNull(); // no ECO attached to this prefix
    db.close();
  });
});

describe("buildOpeningIndex abort + resume safety", () => {
  test("abort leaves the index incomplete (unavailable), then resumes without double-counting", async () => {
    const db = makeGamesDb(["1. e4 e5", "1. e4 c5", "1. e4 e6", "1. e4 d5"]); // 4× 1.e4

    // Abort at the first batch boundary (after 2 games).
    let abortOnce = 1;
    const r1 = await buildOpeningIndex(db, { batchSize: 2, shouldAbort: () => abortOnce-- > 0 });
    expect(r1.completed).toBe(false);
    expect(r1.processed).toBe(2);
    // Bug A: a partial index must NOT read as complete.
    expect(isOpeningIndexBuilt(db)).toBe(false);
    expect(isOpeningIndexStale(db, 4)).toBe(true);
    expect(lineFrequency(db, ["e2e4"])).toBe(2); // only the first two games so far

    // Resume: continues from the persisted cursor, no re-processing of games 1–2.
    const r2 = await buildOpeningIndex(db, { batchSize: 2 });
    expect(r2.completed).toBe(true);
    expect(isOpeningIndexBuilt(db)).toBe(true);
    expect(lineFrequency(db, ["e2e4"])).toBe(4); // all four, counted exactly once each
    db.close();
  });

  test("a changed game count forces a fresh rebuild instead of resuming", async () => {
    const db = makeGamesDb(["1. e4 e5", "1. e4 c5"]);
    let abortOnce = 1;
    await buildOpeningIndex(db, { batchSize: 1, shouldAbort: () => abortOnce-- > 0 }); // partial: 1 game
    expect(lineFrequency(db, ["e2e4"])).toBe(1);

    // A new game is imported → target count changes → no resume, full rebuild.
    db.prepare("INSERT INTO games (pgn_moves) VALUES (?)").run("1. d4 d5");
    const r = await buildOpeningIndex(db, { batchSize: 10 });
    expect(r.completed).toBe(true);
    expect(lineFrequency(db, ["e2e4"])).toBe(2); // exactly the two 1.e4 games (no stale carryover)
    expect(lineFrequency(db, ["d2d4"])).toBe(1);
    expect(isOpeningIndexStale(db, 3)).toBe(false);
    db.close();
  });
});

describe("tagNovelLines", () => {
  const lines: AnalysisLine[] = [
    { rank: 1, score: { type: "cp", value: 30 }, pv: "e2e4 e7e5" }, // best, common first move
    { rank: 2, score: { type: "cp", value: 10 }, pv: "b1a3 e7e5" }  // rare, sound (Na3)
  ];

  test("flags a rare, sound first move as novel and a common one as not", async () => {
    const db = makeGamesDb(["1. e4 e5", "1. e4 c5", "1. e4 e6", "1. e4 d5"]);
    await buildOpeningIndex(db); // 1.e4 played 4×, 1.Na3 never
    const tagged = tagNovelLines(db, [], lines); // no moves played yet → White to move
    expect(tagged.find(l => l.rank === 1)?.novel).toBe(false); // e2e4 common
    expect(tagged.find(l => l.rank === 2)?.novel).toBe(true);  // Na3 rare + sound
    db.close();
  });

  test("uses the played-move path to key novelty", async () => {
    // After 1.e4 e5, 2.Nf3 is common; 2.Bc4 is only in one game here.
    const db = makeGamesDb([
      "1. e4 e5 2. Nf3", "1. e4 e5 2. Nf3", "1. e4 e5 2. Nf3", "1. e4 e5 2. Bc4"
    ]);
    await buildOpeningIndex(db);
    const played = ["e2e4", "e7e5"];
    const candidates: AnalysisLine[] = [
      { rank: 1, score: { type: "cp", value: 25 }, pv: "g1f3 b8c6" }, // common
      { rank: 2, score: { type: "cp", value: 20 }, pv: "f1c4 g8f6" }  // rare (1 game)
    ];
    const tagged = tagNovelLines(db, played, candidates);
    expect(tagged.find(l => l.rank === 1)?.novel).toBe(false);
    expect(tagged.find(l => l.rank === 2)?.novel).toBe(true);
    db.close();
  });

  test("nothing is novel beyond the opening window", async () => {
    const db = makeGamesDb(["1. e4 e5"]);
    await buildOpeningIndex(db);
    const played = new Array(40).fill("e2e4"); // already at the ply cap
    const tagged = tagNovelLines(db, played, [{ rank: 1, score: { type: "cp", value: 0 }, pv: "g1f3" }]);
    expect(tagged[0].novel).toBe(false);
    db.close();
  });

  test("novelty unavailable without a built index → nothing is novel", () => {
    const db = makeGamesDb(["1. e4 e5"]);
    createOpeningIndexTable(db); // table exists but never built
    expect(tagNovelLines(db, [], lines).every(l => l.novel === false)).toBe(true);
    db.close();
  });

  test("novelty unavailable with no games db (null) → nothing is novel", () => {
    expect(tagNovelLines(null, [], lines).every(l => l.novel === false)).toBe(true);
  });
});
