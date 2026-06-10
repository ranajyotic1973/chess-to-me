import { IChessEngine } from "./ChessEngine";
import type { AnalysisResult } from "../types";

function getAPI() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}

export class StockfishEngine extends IChessEngine {
  name: string;

  constructor(path: string) {
    super(path);
    this.name = "Stockfish";
  }

  async init(): Promise<void> {
    const api = getAPI();
    if (!api?.ensureEngineRunning) {
      throw new Error("Engine initialization API unavailable");
    }
    try {
      await api.ensureEngineRunning({ engine: "stockfish", path: this.path });
    } catch (err) {
      throw new Error(`Failed to initialize Stockfish: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async analyze(fen: string, depth: number = 16, multiPv: number = 4): Promise<AnalysisResult> {
    const api = getAPI();
    if (!api?.analyzePosition) {
      throw new Error("Analysis API unavailable");
    }
    try {
      const response = await api.analyzePosition({
        engine: "stockfish",
        fen,
        depth,
        multiPv
      });
      if (!response?.ok) {
        const errorMsg = (response as any)?.error || "Analysis failed";
        throw new Error(errorMsg);
      }
      return (response as any).analysis;
    } catch (err) {
      throw new Error(`Stockfish analysis error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async stop(): Promise<void> {
    try {
      const api = getAPI();
      if (!api?.stopEngine) return;
      await api.stopEngine({ engine: "stockfish" });
    } catch {
      // Engine lifecycle managed by main process; swallow stop errors
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
  }

  getStatus(): { name: string; path: string; ready: boolean } {
    return {
      name: this.name,
      path: this.path,
      ready: !!this.process
    };
  }
}
