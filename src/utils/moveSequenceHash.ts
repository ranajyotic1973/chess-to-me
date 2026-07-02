import type { AnalysisLine } from "../types";

export function createMoveSequenceHash(moves: string[]): string {
  const sequence = moves.join("|");
  let hash = 0;
  for (let i = 0; i < sequence.length; i++) {
    const char = sequence.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function createLineHashMap(lines: AnalysisLine[]): Map<string, number> {
  const hashMap = new Map<string, number>();

  lines.forEach((line, lineIndex) => {
    if (!line.pv) return;

    const moves = line.pv.split(/\s+/).filter((m) => m.length > 0);

    // Create hashes for every prefix of the line
    // e.g., for moves [e4, c5, Nf3], create hashes for:
    // - [e4]
    // - [e4, c5]
    // - [e4, c5, Nf3]
    for (let i = 1; i <= moves.length; i++) {
      const prefix = moves.slice(0, i);
      const hash = createMoveSequenceHash(prefix);
      // Store the line index for this move sequence
      // If multiple lines match, we store the first one (higher ranked)
      if (!hashMap.has(hash)) {
        hashMap.set(hash, lineIndex);
      }
    }
  });

  return hashMap;
}

export function findMatchingLine(moves: string[], hashMap: Map<string, number>): number | null {
  if (moves.length === 0) return null;

  const hash = createMoveSequenceHash(moves);
  return hashMap.get(hash) ?? null;
}

export function convertUCIToMoves(uciString: string): string[] {
  return uciString.trim().split(/\s+/).filter((m) => m.length > 0);
}
