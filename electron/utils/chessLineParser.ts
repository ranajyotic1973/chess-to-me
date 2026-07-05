/**
 * ChessLineParser - Parses UCI engine output (Stockfish, LC0)
 * Handles score extraction, PV parsing, and line ranking.
 */

export interface ParsedScore {
  type: "cp" | "mate" | "wdl";
  value?: number;
  winProb?: number;
  depth?: number;
}

export interface AnalysisLine {
  rank: number;
  score: ParsedScore | null;
  pv: string;
}

export interface ParsedInfoLine {
  depth?: number;
  rank: number;
  score: ParsedScore | null;
  pv: string;
}

/**
 * Parses UCI engine output lines.
 * Supports both Stockfish (CP, mate) and LC0 (WDL) score formats.
 */
export class ChessLineParser {
  private engineName: string;
  private blackToMove: boolean;
  private log: (msg: string) => void;

  constructor(engineName: string, isBlackToMove: boolean, logFn?: (msg: string) => void) {
    this.engineName = engineName;
    this.blackToMove = isBlackToMove;
    this.log = logFn || console.log;
  }

  /**
   * Parse a single UCI "info" line.
   * Returns parsed components: depth, rank, score, and PV.
   */
  parseInfoLine(line: string): ParsedInfoLine {
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const currentDepth = depthMatch ? Number(depthMatch[1]) : undefined;

    const rank = this.extractRank(line);
    const score = this.extractScore(line, currentDepth);
    const pv = this.extractPV(line);

    return { depth: currentDepth, rank, score, pv };
  }

  /**
   * Extract depth from info line.
   */
  private extractRank(line: string): number {
    const mpvMatch = line.match(/\bmultipv\s+(\d+)/);
    return mpvMatch ? Number(mpvMatch[1]) : 1;
  }

  /**
   * Extract score (CP, mate, or WDL) from info line.
   * Scores are converted to white-positive: negate when black is to move.
   */
  private extractScore(line: string, depth?: number): ParsedScore | null {
    // Stockfish: "score cp <value>"
    const scoreCp = line.match(/score\s+cp\s+(-?\d+)/);
    if (scoreCp) {
      const raw = Number(scoreCp[1]);
      const value = this.blackToMove ? -raw : raw;
      this.log(`[${this.engineName}] ✓ Parsed CP score: ${raw} cp → ${value} (white-positive, depth ${depth})`);
      return { type: "cp", value, depth };
    }

    // Stockfish: "score mate <value>"
    const scoreMate = line.match(/score\s+mate\s+(-?\d+)/);
    if (scoreMate) {
      const raw = Number(scoreMate[1]);
      const value = this.blackToMove ? -raw : raw;
      this.log(`[${this.engineName}] ✓ Parsed MATE score: mate in ${raw} → ${value} (white-positive, depth ${depth})`);
      return { type: "mate", value, depth };
    }

    // LC0: "score wdl <wins> <draws> <losses>"
    const scoreWdl = line.match(/score\s+wdl\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (scoreWdl) {
      const wins = Number(scoreWdl[1]);
      const draws = Number(scoreWdl[2]);
      const losses = Number(scoreWdl[3]);
      const total = wins + draws + losses;
      const winProb = total > 0 ? (this.blackToMove ? losses / total : wins / total) : 0;
      this.log(`[${this.engineName}] ✓ Parsed WDL score: ${wins}/${draws}/${losses} → ${(winProb * 100).toFixed(1)}% white win prob (depth ${depth})`);
      return { type: "wdl", winProb, depth };
    }

    this.log(`[${this.engineName}] ⚠ No score found in line`);
    return null;
  }

  /**
   * Extract principal variation (PV) from info line.
   */
  private extractPV(line: string): string {
    const pvMatch = line.match(/\s+pv\s+(.+)$/);
    if (pvMatch) {
      this.log(`[${this.engineName}] ✓ Parsed PV: ${pvMatch[1]}`);
      return pvMatch[1].trim();
    }
    return "";
  }

  /**
   * Check if line contains a valid "info" command.
   */
  static isInfoLine(line: string): boolean {
    return /^info\s/.test(line) || line === "info";
  }

  /**
   * Check if line contains the "bestmove" command (end of analysis).
   */
  static isBestmoveLine(line: string): boolean {
    return line.startsWith("bestmove ");
  }

  /**
   * Extract best move from "bestmove" line.
   */
  static extractBestMove(line: string): string {
    return line.split(" ")[1] || "";
  }

  /**
   * Extract the ponder move from a "bestmove" line, e.g.
   * "bestmove a7a6 ponder b5a4" → "b5a4". Returns "" when no ponder move is
   * present (e.g. "bestmove a7a6" or "bestmove (none)").
   */
  static extractPonderMove(line: string): string {
    const tokens = line.trim().split(/\s+/);
    const ponderIdx = tokens.indexOf("ponder");
    if (ponderIdx === -1) return "";
    const move = tokens[ponderIdx + 1] || "";
    return move === "(none)" ? "" : move;
  }
}
