import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Import after setting up mocks
let loadPoints: typeof import("./puzzlePoints").loadPoints;
let savePoints: typeof import("./puzzlePoints").savePoints;
let recordSolve: typeof import("./puzzlePoints").recordSolve;
let getPoints: typeof import("./puzzlePoints").getPoints;

const tmpDir = path.join(os.tmpdir(), "chess-to-me-points-test-" + process.pid);
const pointsFile = path.join(tmpDir, "chess-to-me", "puzzle-points.json");

beforeEach(() => {
  // Clean slate: remove the module from cache so in-memory state resets
  jest.resetModules();
  ({ loadPoints, savePoints, recordSolve, getPoints } = require("./puzzlePoints"));
  if (fs.existsSync(pointsFile)) fs.unlinkSync(pointsFile);
  if (fs.existsSync(path.dirname(pointsFile))) {
    fs.rmSync(path.dirname(pointsFile), { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
});

describe("loadPoints", () => {
  it("returns null/false when file does not exist", () => {
    const state = loadPoints(tmpDir);
    expect(state.points).toBeNull();
    expect(state.frozenAtZero).toBe(false);
  });

  it("reads existing file", () => {
    fs.mkdirSync(path.dirname(pointsFile), { recursive: true });
    fs.writeFileSync(pointsFile, JSON.stringify({ points: 1450, frozenAtZero: false }));
    const state = loadPoints(tmpDir);
    expect(state.points).toBe(1450);
    expect(state.frozenAtZero).toBe(false);
  });
});

describe("recordSolve — seeding", () => {
  it("seeds from first solve ELO", () => {
    const state = recordSolve(1450, true, tmpDir);
    expect(state.points).toBe(1450);
    expect(state.frozenAtZero).toBe(false);
  });

  it("seeds to 1200 when rating is 0", () => {
    const state = recordSolve(0, true, tmpDir);
    expect(state.points).toBe(1200);
  });

  it("failure before any solve does nothing", () => {
    const state = recordSolve(1200, false, tmpDir);
    expect(state.points).toBeNull();
    expect(state.frozenAtZero).toBe(false);
  });
});

describe("recordSolve — difficulty tiers", () => {
  beforeEach(() => {
    recordSolve(1000, true, tmpDir); // seed at 1000 (easy tier for future additions)
  });

  it("easy puzzle (<1200) awards +5", () => {
    const state = recordSolve(800, true, tmpDir);
    expect(state.points).toBe(1000 + 5);
  });

  it("medium puzzle (1200-1799) awards +10", () => {
    const state = recordSolve(1300, true, tmpDir);
    expect(state.points).toBe(1000 + 10);
  });

  it("hard puzzle (>=1800) awards +15", () => {
    recordSolve(1300, true, tmpDir); // +10 → 1010
    const state = recordSolve(2000, true, tmpDir); // +15 → 1025
    expect(state.points).toBe(1000 + 10 + 15);
  });
});

describe("recordSolve — failure deduction", () => {
  it("deducts 25 points on failure", () => {
    recordSolve(1000, true, tmpDir); // seed at 1000
    const state = recordSolve(1200, false, tmpDir);
    expect(state.points).toBe(975);
    expect(state.frozenAtZero).toBe(false);
  });

  it("does not go below zero", () => {
    recordSolve(1000, true, tmpDir); // seed
    // Deduct until close to zero
    for (let i = 0; i < 39; i++) recordSolve(1200, false, tmpDir); // 39 * 25 = 975
    const state = recordSolve(1200, false, tmpDir); // 1000 - 40*25 = 0
    expect(state.points).toBe(0);
    expect(state.frozenAtZero).toBe(true);
  });

  it("sets frozenAtZero when reaching zero", () => {
    recordSolve(20, true, tmpDir); // seed at 20 (but 20 < 1200, so +5 next)
    // Actually seed: first solve sets points = 20
    const state = recordSolve(1200, false, tmpDir); // 20 - 25 = 0, frozen
    expect(state.points).toBe(0);
    expect(state.frozenAtZero).toBe(true);
  });
});

describe("frozenAtZero behaviour", () => {
  beforeEach(() => {
    recordSolve(20, true, tmpDir); // seed at 20
    recordSolve(1200, false, tmpDir); // → 0, frozen
  });

  it("further failures do not deduct when frozen", () => {
    const state = recordSolve(1200, false, tmpDir);
    expect(state.points).toBe(0);
  });

  it("successes still add points after frozen", () => {
    const state = recordSolve(1200, true, tmpDir); // +10
    expect(state.points).toBe(10);
    expect(state.frozenAtZero).toBe(true);
  });
});

describe("in-memory resilience (file deletion)", () => {
  it("recreates file on next write after deletion", () => {
    recordSolve(1500, true, tmpDir); // seed, writes file
    expect(fs.existsSync(pointsFile)).toBe(true);
    fs.unlinkSync(pointsFile); // delete the file
    expect(fs.existsSync(pointsFile)).toBe(false);
    recordSolve(1200, true, tmpDir); // triggers savePoints, should recreate
    expect(fs.existsSync(pointsFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(pointsFile, "utf8"));
    expect(data.points).toBe(1500 + 10); // seed + medium
  });

  it("getPoints returns in-memory value without reading file", () => {
    recordSolve(1500, true, tmpDir);
    fs.unlinkSync(pointsFile);
    const state = getPoints();
    expect(state.points).toBe(1500);
  });
});
