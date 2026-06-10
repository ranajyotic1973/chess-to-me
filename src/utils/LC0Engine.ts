import { IChessEngine } from "./ChessEngine";
import type { AnalysisResult } from "../types";

function getAPI() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}

export class LC0Engine extends IChessEngine {
  name: string;

  constructor(path: string) {
    super(path);
    this.name = "LC0";
  }

  async init(): Promise<void> {
    const api = getAPI();
    if (!api?.ensureEngineRunning) {
      throw new Error("Engine initialization API unavailable");
    }
    try {
      await api.ensureEngineRunning({ engine: "lc0", path: this.path });
    } catch (err) {
      throw new Error(`Failed to initialize LC0: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async analyze(fen: string, depth: number = 16, multiPv: number = 4): Promise<AnalysisResult> {
    const api = getAPI();
    if (!api?.analyzePosition) {
      throw new Error("Analysis API unavailable");
    }
    try {
      const response = await api.analyzePosition({
        engine: "lc0",
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
      throw new Error(`LC0 analysis error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async stop(): Promise<void> {
    try {
      const api = getAPI();
      if (!api?.stopEngine) return;
      await api.stopEngine({ engine: "lc0" });
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
