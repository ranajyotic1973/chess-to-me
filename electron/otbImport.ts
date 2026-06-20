import * as fs from "fs";
import * as path from "path";

export function getOtbTrackingFilePath(userDataPath: string): string {
  return path.join(userDataPath, "chess-to-me", "imported-otb-files.json");
}

export function readOtbTracking(userDataPath: string): string[] {
  const p = getOtbTrackingFilePath(userDataPath);
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOtbTracking(userDataPath: string, names: string[]): void {
  const p = getOtbTrackingFilePath(userDataPath);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(names, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Failed to write OTB tracking file:", err);
  }
}

export function scanOtbFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath);
  return entries
    .filter(name => /OTB/i.test(name) && name.toLowerCase().endsWith(".7z"))
    .map(name => path.join(dirPath, name))
    .sort();
}

/**
 * Overall batch progress for the two-phase OTB import pipeline.
 * Extraction accounts for the first 50%, import for the second 50%,
 * so the value only ever moves forward as archives are processed.
 */
export function computeOverallPercent(
  phase: "extracting" | "importing",
  completed: number,
  total: number
): number {
  if (total <= 0) return 0;
  const half = Math.round((completed / total) * 50);
  return phase === "extracting" ? half : 50 + half;
}
