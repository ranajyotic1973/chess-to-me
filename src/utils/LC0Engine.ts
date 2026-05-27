import { IChessEngine } from "./ChessEngine";
import type { AnalysisResult } from "../types";

const electronAPI = typeof window !== "undefined" ? window.electronAPI : null;

export class LC0Engine extends IChessEngine {
  name: string;

  constructor(path: string) {
    super(path);
    this.name = "LC0";
  }

  async init(): Promise<void> {
    // Engine is lazily initialized on first analysis call
  }

  async analyze(fen: string, depth: number = 16, multiPv: number = 4): Promise<AnalysisResult> {
    if (!electronAPI?.analyzePosition) {
      throw new Error("Analysis API unavailable");
    }
    try {
      const response = await electronAPI.analyzePosition({
        engine: "lc0",
        fen,
        depth,
        multiPv
      });
      if (!response?.ok) {
        const errorMsg = (response as any)?.error || "Analysis failed";
        throw new Error(errorMsg);
      }
      return response.analysis;
    } catch (err) {
      throw new Error(`LC0 analysis error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async stop(): Promise<void> {
    // Engine lifecycle is managed by the main process
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
