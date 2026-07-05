/**
 * StockfishEngine - Concrete implementation for Stockfish
 * Inherits common analysis logic from BaseChessEngine
 * Only defines Stockfish-specific options and commands
 */

import { BaseChessEngine } from "./BaseChessEngine";
import { EngineCapability } from "./IChessEngine";
import { clampMultiPv, explorationOptions } from "./engineTuning";

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
   * Stockfish options before analysis.
   * Supports MultiPV (up to MAX_MULTIPV). Stockfish variety comes from MultiPV;
   * it has no safe creativity knob, so `explore` adds no extra options here.
   */
  protected sendEngineOptions(multiPv: number, explore: boolean): void {
    this.sendCommand(`setoption name MultiPV value ${clampMultiPv(multiPv)}`);
    for (const cmd of explorationOptions(this.name, explore)) {
      this.sendCommand(cmd);
    }
  }

  /**
   * Stockfish analysis command
   */
  protected sendAnalysisCommand(depth: number): void {
    this.sendCommand(`go depth ${depth}`);
  }
}
