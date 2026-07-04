/**
 * BoardStateManager - Manages chess board state and move validation
 * Handles board representation, legal move generation, and position tracking
 */

import { Chess } from "chess.js";

export class BoardStateManager {
  private board: Chess;

  constructor() {
    this.board = new Chess();
  }

  getBoardFen(): string {
    return this.board.fen();
  }

  setBoardFen(fen: string): boolean {
    try {
      this.board.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  getLegalMoves(): string[] {
    return this.board.moves({ verbose: false }) as string[];
  }

  validateMove(from: string, to: string): { valid: boolean; reason?: string } {
    const move = this.board.move({ from, to, promotion: "q" });
    if (move) {
      this.board.undo();
      return { valid: true };
    }
    return { valid: false, reason: "move is not legal in current position" };
  }

  applyMove(from: string, to: string): { ok: boolean; fen?: string; error?: string } {
    const validation = this.validateMove(from, to);
    if (!validation.valid) {
      return { ok: false, error: validation.reason };
    }
    const move = this.board.move({ from, to, promotion: "q" });
    if (!move) {
      return { ok: false, error: "failed to apply move" };
    }
    return { ok: true, fen: this.board.fen() };
  }

  reset(fen: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"): void {
    this.board.reset();
    if (fen !== this.board.fen()) {
      this.board.load(fen);
    }
  }
}
