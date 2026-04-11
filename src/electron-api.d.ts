export {};

declare global {
  interface Window {
    electronAPI: {
      detectStockfish: () => Promise<{ found: boolean; path: string }>;
      browseStockfish: () => Promise<{ selected: boolean; valid?: boolean; path: string }>;
      setStockfishPath: (enginePath: string) => Promise<{ ok: boolean; path?: string }>;
      getEngineStatus: () => Promise<{
        path: string;
        configured: boolean;
        settings?: {
          analysisDepth: number;
          explainLanguage: string;
          ollamaModel: string;
          ollamaBaseUrl: string;
          referenceApiKey: string;
          referenceDbUsers: string;
        };
      }>;
      updateAppSettings: (payload: {
        analysisDepth: number;
        explainLanguage: string;
        ollamaModel: string;
        ollamaBaseUrl: string;
        referenceApiKey: string;
        referenceDbUsers: string;
      }) => Promise<{
        ok: boolean;
        settings: {
          analysisDepth: number;
          explainLanguage: string;
          ollamaModel: string;
          ollamaBaseUrl: string;
          referenceApiKey: string;
          referenceDbUsers: string;
        };
      }>;
      analyzePosition: (payload: {
        fen: string;
        depth?: number;
        multiPv?: number;
      }) => Promise<{
        ok: boolean;
        error?: string;
        analysis?: {
          bestMove: string;
          lines: Array<{
            rank: number;
            score: { type: "cp" | "mate"; value: number } | null;
            pv: string;
          }>;
        };
      }>;
      explainLines: (payload: {
        fen: string;
        language: string;
        model: string;
        baseUrl: string;
        lines: Array<{
          rank: number;
          score: { type: "cp" | "mate"; value: number } | null;
          pv: string;
        }>;
      }) => Promise<{
        ok: boolean;
        error?: string;
        explanations?: Array<{ rank: number; text: string }>;
      }>;
      pickReferencePgn: () => Promise<{ selected: boolean; path: string }>;
      readReferencePgn: (
        filePath: string
      ) => Promise<{ ok: boolean; content?: string; error?: string }>;
      readBundledReferencePgn: () => Promise<{
        ok: boolean;
        content?: string;
        path?: string;
        error?: string;
      }>;
      fetchLichessReferenceGames: (payload: {
        usernames: string[];
        maxPerUser?: number;
        minElo?: number;
        apiKey?: string;
      }) => Promise<{
        ok: boolean;
        source?: string;
        count?: number;
        pgn?: string;
        error?: string;
      }>;
      openExternalUrl: (url: string) => Promise<{ ok: boolean }>;
      getSystemStatus: () => Promise<{
        platform: string;
        ollamaRunning: boolean;
        qwen3Installed: boolean;
        stockfishFound: boolean;
        stockfishPath: string;
      }>;
    };
  }
}
