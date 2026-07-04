/**
 * StockfishEngine - Concrete implementation for Stockfish
 * Inherits common analysis logic from BaseChessEngine
 * Only defines Stockfish-specific options and commands
 */

import { BaseChessEngine } from "./BaseChessEngine";
import { EngineCapability } from "./IChessEngine";

const STOCKFISH_TIMEOUT_MS = 30000;
const STOCKFISH_DEFAULT_DEPTH = 20;

export class StockfishEngine extends BaseChessEngine {
  readonly name = "Stockfish";
  readonly version: string;
  readonly capabilities: EngineCapability = {
    supportsMultiPV: true,
    supportsWDL: false,
    supportsCP: true,
    supportsMate: true
  };

  constructor(enginePath: string, version: string = "15") {
    super(enginePath);
    this.version = version;
  }

  protected getDefaultDepth(): number {
    return STOCKFISH_DEFAULT_DEPTH;
  }

  protected getDefaultTimeoutMs(): number {
    return STOCKFISH_TIMEOUT_MS;
  }

  /**
   * Stockfish options before analysis
   * Supports: MultiPV, hash size, threads
   */
  protected sendEngineOptions(multiPv: number): void {
    this.sendCommand(`setoption name MultiPV value ${Math.max(1, Math.min(4, multiPv))}`);
    // Can add more options here:
    // this.sendCommand("setoption name Hash value 256");
    // this.sendCommand("setoption name Threads value 4");
  }

  /**
   * Stockfish analysis command
   */
  protected sendAnalysisCommand(depth: number): void {
    this.sendCommand(`go depth ${depth}`);
  }
}
