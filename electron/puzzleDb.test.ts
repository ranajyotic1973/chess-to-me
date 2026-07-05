import Database from "better-sqlite3";
import {
  initPuzzleDb,
  importPuzzlesFromCsv,
  isPuzzleImportComplete,
  hasPuzzles,
  searchPuzzles,
  normalizeThemeKeyword
} from "./puzzleDb";

const HEADER = "PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags";

function buildCsv(n: number): Buffer {
  const lines = [HEADER];
  for (let i = 0; i < n; i++) {
    lines.push(`p${i},8/8/8/8/8/8/8/8 w - - 0 1,e2e4 e7e5,1500,50,90,100,mateIn2 fork,https://lichess.org/${i},`);
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

describe("normalizeThemeKeyword", () => {
  test("maps friendly keywords to Lichess theme names", () => {
    expect(normalizeThemeKeyword("mate in 2")).toBe("mateIn2");
    expect(normalizeThemeKeyword("fork")).toBe("fork");
    expect(normalizeThemeKeyword("unknown theme")).toBe("unknown theme");
  });
});

describe("importPuzzlesFromCsv", () => {
  test("full import completes, sets the flag, and loads rows", async () => {
    const db = initPuzzleDb(":memory:");
    const result = await importPuzzlesFromCsv(db, buildCsv(10));

    expect(result.completed).toBe(true);
    expect(result.imported).toBe(10);
    expect(isPuzzleImportComplete(db)).toBe(true);
    expect(hasPuzzles(db)).toBe(true);
    const count = (db.prepare("SELECT COUNT(*) AS c FROM puzzles").get() as { c: number }).c;
    expect(count).toBe(10);
    db.close();
  });

  test("aborting mid-import leaves it incomplete (so it is re-run, not trusted)", async () => {
    const db = initPuzzleDb(":memory:");
    // >1 batch so the abort check (at each 1000-row boundary) is reached.
    const result = await importPuzzlesFromCsv(db, buildCsv(2500), { shouldAbort: () => true });

    expect(result.completed).toBe(false);
    expect(result.imported).toBe(1000); // stopped after the first committed batch
    expect(isPuzzleImportComplete(db)).toBe(false); // Bug B: partial ≠ complete
    db.close();
  });

  test("a completed import is searchable", async () => {
    const db = initPuzzleDb(":memory:");
    await importPuzzlesFromCsv(db, buildCsv(5));
    const rows = searchPuzzles(db, { theme: "mate in 2", limit: 3 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].themes).toContain("mateIn2");
    db.close();
  });
});

describe("isPuzzleImportComplete legacy migration", () => {
  test("a pre-existing DB with puzzles but no flag is treated as complete", () => {
    const db = initPuzzleDb(":memory:");
    // Simulate a legacy DB: rows present, but the completion flag was never written.
    db.prepare(
      "INSERT INTO puzzles (puzzle_id, fen, moves, rating, popularity) VALUES ('legacy', '8/8 w - - 0 1', 'e2e4', 1400, 50)"
    ).run();
    expect(db.prepare("SELECT value FROM meta WHERE key='puzzle_import_complete'").get()).toBeUndefined();

    expect(isPuzzleImportComplete(db)).toBe(true);
    // and it persists the migration
    expect((db.prepare("SELECT value FROM meta WHERE key='puzzle_import_complete'").get() as { value: string }).value).toBe("true");
    db.close();
  });

  test("an empty DB is not complete", () => {
    const db = initPuzzleDb(":memory:");
    expect(isPuzzleImportComplete(db)).toBe(false);
    db.close();
  });
});
