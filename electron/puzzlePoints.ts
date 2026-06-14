import fs from "node:fs";
import path from "node:path";
import type { PuzzlePointsState } from "../src/types";

const POINTS_FILE = "puzzle-points.json";

// In-memory write-through cache — survives file deletion during a session
let cache: PuzzlePointsState = { points: null, frozenAtZero: false };

function pointsFilePath(userDataPath: string): string {
  return path.join(userDataPath, "chess-to-me", POINTS_FILE);
}

export function loadPoints(userDataPath: string): PuzzlePointsState {
  const filePath = pointsFilePath(userDataPath);
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const state: PuzzlePointsState = {
        points: typeof data.points === "number" ? data.points : null,
        frozenAtZero: Boolean(data.frozenAtZero),
      };
      cache = state;
      return state;
    }
  } catch (err) {
    console.error("[PuzzlePoints] Failed to load:", err);
  }
  cache = { points: null, frozenAtZero: false };
  return { ...cache };
}

export function savePoints(userDataPath: string, state: PuzzlePointsState): void {
  const filePath = pointsFilePath(userDataPath);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("[PuzzlePoints] Failed to save:", err);
  }
}

function difficultyDelta(rating: number): number {
  if (rating < 1200) return 5;
  if (rating < 1800) return 10;
  return 15;
}

export function recordSolve(rating: number, solved: boolean, userDataPath: string): PuzzlePointsState {
  let { points, frozenAtZero } = cache;

  if (solved) {
    if (points === null) {
      // Seed from first solve ELO
      points = rating > 0 ? rating : 1200;
    } else {
      points += difficultyDelta(rating);
    }
  } else {
    // Failure — only deduct if already seeded and not frozen
    if (points !== null && !frozenAtZero) {
      points = Math.max(0, points - 25);
      if (points === 0) frozenAtZero = true;
    }
  }

  cache = { points, frozenAtZero };
  savePoints(userDataPath, cache);
  return { ...cache };
}

export function getPoints(): PuzzlePointsState {
  return { ...cache };
}
