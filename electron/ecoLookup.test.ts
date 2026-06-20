// Tests for ecoLookup helpers, backed by bundled local JSON files (see data/eco/).
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { initEcoLookup, lookupOpeningByFen, lookupOpeningByMoves, isEcoAvailable } from "./ecoLookup";

const RUY_LOPEZ_FEN = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
// chess.js v1+ only includes the en passant square when capture is actually possible,
// so after 1.e4 c5 (no white pawn on b5/d5) the ep field is "-", not "c6".
const SICILIAN_FEN = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const FAKE_BOOK: Record<string, { eco: string; name: string }> = {
  [RUY_LOPEZ_FEN]: { eco: "C60", name: "Ruy Lopez" },
  [SICILIAN_FEN]:  { eco: "B20", name: "Sicilian Defense" }
};

const ECO_DATA_FILES = ["ecoA.json", "ecoB.json", "ecoC.json", "ecoD.json", "ecoE.json", "eco_interpolated.json"];

describe("ecoLookup", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eco-test-"));
    for (const file of ECO_DATA_FILES) {
      fs.writeFileSync(path.join(tmpDir, file), JSON.stringify(file === "ecoA.json" ? FAKE_BOOK : {}));
    }
    await initEcoLookup(tmpDir);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("library loads successfully", () => {
    expect(isEcoAvailable()).toBe(true);
  });

  test("lookupOpeningByFen returns match for known position", () => {
    const result = lookupOpeningByFen(RUY_LOPEZ_FEN);
    expect(result).not.toBeNull();
    expect(result?.eco).toBe("C60");
    expect(result?.name).toBe("Ruy Lopez");
  });

  test("lookupOpeningByFen returns null for unknown position", () => {
    const result = lookupOpeningByFen("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result).toBeNull();
  });

  test("lookupOpeningByMoves returns last known opening in move sequence", () => {
    // 1.e4 c5 → Sicilian Defense
    const result = lookupOpeningByMoves(["e2e4", "c7c5"]);
    expect(result).not.toBeNull();
    expect(result?.eco).toBe("B20");
    expect(result?.name).toBe("Sicilian Defense");
  });

  test("lookupOpeningByMoves returns null for empty moves array", () => {
    expect(lookupOpeningByMoves([])).toBeNull();
  });

  test("lookupOpeningByMoves handles invalid UCI move gracefully", () => {
    expect(() => lookupOpeningByMoves(["e2e4", "INVALID"])).not.toThrow();
  });

  test("lookupOpeningByFen returns null for unrecognised FEN", () => {
    expect(lookupOpeningByFen("UNKNOWN_FEN")).toBeNull();
  });
});

describe("ecoLookup — data files missing", () => {
  test("initEcoLookup degrades gracefully instead of throwing", async () => {
    await initEcoLookup(path.join(os.tmpdir(), "eco-test-does-not-exist"));
    expect(isEcoAvailable()).toBe(false);
    expect(lookupOpeningByFen(RUY_LOPEZ_FEN)).toBeNull();
    expect(lookupOpeningByMoves(["e2e4"])).toBeNull();
  });
});
