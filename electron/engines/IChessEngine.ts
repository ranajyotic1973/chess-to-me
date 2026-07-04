/**
 * IChessEngine - Abstract interface for chess engine implementations
 * Defines contract that all concrete engines (Stockfish, LC0, etc.) must implement
 */

export interface EngineCapability {
  supportsMultiPV: boolean;
  supportsWDL: boolean;
  supportsCP: boolean;
  supportsMate: boolean;
}

export interface AnalysisResult {
  bestMove: string;
  lines: Array<{
    rank: number;
    score: {
      type: "cp" | "mate" | "wdl";
      value?: number;
      winProb?: number;
      depth?: number;
    } | null;
    pv: string;
  }>;
}

export interface AnalysisParams {
  fen: string;
  depth?: number;
  multiPv?: number;
  timeoutMs?: number;
}

export interface LogEntry {
  text: string;
  stream: "stdout" | "stderr";
  context: string;
  timestamp?: string;
}

export interface IChessEngine {
  /**
   * Engine name (e.g., "Stockfish", "LC0")
   */
  readonly name: string;

  /**
   * Engine version/build info
   */
  readonly version: string;

  /**
   * Engine capabilities
   */
  readonly capabilities: EngineCapability;

  /**
   * Check if engine process is running
   */
  isRunning(): boolean;

  /**
   * Start the engine process
   */
  start(): Promise<void>;

  /**
   * Stop the engine process gracefully
   */
  stop(): Promise<void>;

  /**
   * Send raw command to engine (e.g., "go depth 20")
   */
  sendCommand(command: string): void;

  /**
   * Analyze a position and return best move + variations
   */
  analyze(params: AnalysisParams): Promise<AnalysisResult>;

  /**
   * Set logging callback
   */
  onLog(callback: (entry: LogEntry) => void): void;

  /**
   * Cleanup resources
   */
  dispose(): void;
}
