import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI, IpcPayloads, IpcResponses } from "../src/types";

contextBridge.exposeInMainWorld("electronAPI", {
  // Engine detection and browsing
  detectEngine: (options: IpcPayloads["detectEngine"]) =>
    ipcRenderer.invoke("detectEngine", options) as Promise<IpcResponses["detectEngine"]>,
  browseForEngine: (options: IpcPayloads["browseForEngine"]) =>
    ipcRenderer.invoke("browseForEngine", options) as Promise<IpcResponses["browseForEngine"]>,

  // Legacy API for backward compatibility
  detectStockfish: () =>
    ipcRenderer.invoke("detectEngine", { engine: "stockfish" }) as Promise<IpcResponses["detectEngine"]>,
  browseStockfish: () =>
    ipcRenderer.invoke("browseForEngine", { engine: "stockfish" }) as Promise<IpcResponses["browseForEngine"]>,

  // Engine configuration
  setEnginePath: (options: IpcPayloads["setEnginePath"]) =>
    ipcRenderer.invoke("setEnginePath", options) as Promise<IpcResponses["setEnginePath"]>,
  getEngineStatus: () =>
    ipcRenderer.invoke("getEngineStatus") as Promise<IpcResponses["getEngineStatus"]>,

  // Analysis
  analyzePosition: (payload: IpcPayloads["analyzePosition"]) =>
    ipcRenderer.invoke("analyzePosition", payload) as Promise<IpcResponses["analyzePosition"]>,
  ecoLookupFen: (fen: string) =>
    ipcRenderer.invoke("eco:lookup-fen", { fen }) as Promise<{ eco: string; name: string } | null>,

  // Settings
  updateAppSettings: (payload: IpcPayloads["updateAppSettings"]) =>
    ipcRenderer.invoke("app:update-settings", payload) as Promise<IpcResponses["updateAppSettings"]>,

  // LLM
  explainLines: (payload: IpcPayloads["explainLines"]) =>
    ipcRenderer.invoke("llm:explain-lines", payload) as Promise<IpcResponses["explainLines"]>,
  identifyOpening: (payload: IpcPayloads["opening:identify"]) =>
    ipcRenderer.invoke("opening:identify", payload) as Promise<IpcResponses["opening:identify"]>,
  isValidOpeningPosition: (payload: IpcPayloads["opening:is-valid-position"]) =>
    ipcRenderer.invoke("opening:is-valid-position", payload) as Promise<IpcResponses["opening:is-valid-position"]>,
  askQuestion: (payload?: IpcPayloads["askQuestion"]) => {
    const { userMessage, question, ...rest } = payload || {};
    return ipcRenderer.invoke("llm:ask-question", { userMessage, question, ...rest }) as Promise<IpcResponses["askQuestion"]>;
  },
  getAvailableModels: (payload: IpcPayloads["getAvailableModels"]) =>
    ipcRenderer.invoke("getAvailableModels", payload) as Promise<IpcResponses["getAvailableModels"]>,

  // LLM Chess Tools
  validateMove: (options: IpcPayloads["validateMove"]) =>
    ipcRenderer.invoke("validateMove", options) as Promise<IpcResponses["validateMove"]>,
  applyMove: (options: IpcPayloads["applyMove"]) =>
    ipcRenderer.invoke("applyMove", options) as Promise<IpcResponses["applyMove"]>,
  getBoardFen: () =>
    ipcRenderer.invoke("getBoardFen") as Promise<IpcResponses["getBoardFen"]>,
  getLegalMoves: () =>
    ipcRenderer.invoke("getLegalMoves") as Promise<IpcResponses["getLegalMoves"]>,
  analyzeBoardPosition: (options: IpcPayloads["analyzeBoardPosition"]) =>
    ipcRenderer.invoke("analyzeBoardPosition", options) as Promise<IpcResponses["analyzeBoardPosition"]>,

  // Logging and state
  getProcessLogs: () =>
    ipcRenderer.invoke("process:get-logs") as Promise<IpcResponses["getProcessLogs"]>,
  onLogEntry: (callback: (data: { bucket: string; entry: any }) => void) => {
    const handler = (_event: any, data: { bucket: string; entry: any }) => callback(data);
    ipcRenderer.on("process:log-entry", handler);
    return () => ipcRenderer.removeListener("process:log-entry", handler);
  },

  onAgentProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("analysis:agent-progress", handler);
    return () => ipcRenderer.removeListener("analysis:agent-progress", handler);
  },

  stopEngine: (args?: { engine?: string }) =>
    ipcRenderer.invoke("engine:stop", args ?? {}) as Promise<{ ok: boolean }>,

  onEngineWarmingUp: (callback: (data: { engine: string }) => void) => {
    const handler = (_event: any, data: { engine: string }) => callback(data);
    ipcRenderer.on("engine:warming-up", handler);
    return () => ipcRenderer.removeListener("engine:warming-up", handler);
  },

  onEngineReady: (callback: (data: { engine: string; ok: boolean }) => void) => {
    const handler = (_event: any, data: { engine: string; ok: boolean }) => callback(data);
    ipcRenderer.on("engine:ready", handler);
    return () => ipcRenderer.removeListener("engine:ready", handler);
  },

  onEngineAnalysisStart: (callback: (data: { engine: string }) => void) => {
    const handler = (_event: any, data: { engine: string }) => callback(data);
    ipcRenderer.on("engine:analysis-start", handler);
    return () => ipcRenderer.removeListener("engine:analysis-start", handler);
  },

  onEngineAnalysisDone: (callback: (data: { engine: string }) => void) => {
    const handler = (_event: any, data: { engine: string }) => callback(data);
    ipcRenderer.on("engine:analysis-done", handler);
    return () => ipcRenderer.removeListener("engine:analysis-done", handler);
  },

  onLlmGenerationStart: (callback: (data: { provider: string }) => void) => {
    const handler = (_event: any, data: { provider: string }) => callback(data);
    ipcRenderer.on("llm:generation-start", handler);
    return () => ipcRenderer.removeListener("llm:generation-start", handler);
  },

  onLlmGenerationDone: (callback: (data: { provider: string; error?: boolean }) => void) => {
    const handler = (_event: any, data: { provider: string; error?: boolean }) => callback(data);
    ipcRenderer.on("llm:generation-done", handler);
    return () => ipcRenderer.removeListener("llm:generation-done", handler);
  },

  setOllamaModel: (model: string) =>
    ipcRenderer.invoke("process:set-model", model) as Promise<IpcResponses["setOllamaModel"]>,

  // System info
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("app:open-external", url) as Promise<IpcResponses["openExternalUrl"]>,
  getSystemStatus: () =>
    ipcRenderer.invoke("app:system-check") as Promise<IpcResponses["getSystemStatus"]>,
  checkSettingsExist: () =>
    ipcRenderer.invoke("app:check-settings-exist") as Promise<{ exists: boolean }>,

  // Database
  dbStatus: () =>
    ipcRenderer.invoke("db:status") as Promise<IpcResponses["db:status"]>,
  dbDownloadPuzzles: () =>
    ipcRenderer.invoke("db:download-puzzles") as Promise<IpcResponses["db:download-puzzles"]>,
  dbCheckPuzzleUpdate: () =>
    ipcRenderer.invoke("db:check-puzzle-update") as Promise<IpcResponses["db:check-puzzle-update"]>,
  dbBrowseGamesFile: () =>
    ipcRenderer.invoke("db:browse-games-file") as Promise<IpcResponses["db:browse-games-file"]>,
  dbImportGames7z: (filePath: string) =>
    ipcRenderer.invoke("db:import-games-7z", { filePath }) as Promise<IpcResponses["db:import-games-7z"]>,
  dbImportStatus: () =>
    ipcRenderer.invoke("db:import-status") as Promise<IpcResponses["db:import-status"]>,
  dbSearchPuzzles: (params: IpcPayloads["db:search-puzzles"]) =>
    ipcRenderer.invoke("db:search-puzzles", params) as Promise<IpcResponses["db:search-puzzles"]>,
  dbSearchGames: (params: IpcPayloads["db:search-games"]) =>
    ipcRenderer.invoke("db:search-games", params) as Promise<IpcResponses["db:search-games"]>,
  dbDeletePuzzles: () =>
    ipcRenderer.invoke("db:delete-puzzles") as Promise<IpcResponses["db:delete-puzzles"]>,
  dbDeleteGames: () =>
    ipcRenderer.invoke("db:delete-games") as Promise<IpcResponses["db:delete-games"]>,
  puzzleExplainIncorrect: (payload: IpcPayloads["puzzle:explain-incorrect"]) =>
    ipcRenderer.invoke("puzzle:explain-incorrect", payload) as Promise<IpcResponses["puzzle:explain-incorrect"]>,

  // User profile
  getDisplayName: () =>
    ipcRenderer.invoke("profile:get-display-name") as Promise<IpcResponses["profile:get-display-name"]>,
  setDisplayName: (displayName: string) =>
    ipcRenderer.invoke("profile:set-display-name", { displayName }) as Promise<IpcResponses["profile:set-display-name"]>,

  // Puzzle points
  getPoints: () =>
    ipcRenderer.invoke("points:get") as Promise<IpcResponses["points:get"]>,
  recordSolve: (payload: IpcPayloads["points:record-solve"]) =>
    ipcRenderer.invoke("points:record-solve", payload) as Promise<IpcResponses["points:record-solve"]>,

  // Conversation memory
  loadConversation: (args: { mode: string }) =>
    ipcRenderer.invoke("conversation:load", args) as Promise<{ ok: boolean; history: any[] }>,
  saveConversation: (args: { mode: string; history: any[] }) =>
    ipcRenderer.invoke("conversation:save", args) as Promise<{ ok: boolean; error?: string }>,

  // Training agents
  openingAsk: (args: IpcPayloads["opening:ask"]) =>
    ipcRenderer.invoke("opening:ask", args) as Promise<IpcResponses["opening:ask"]>,
  endgameAsk: (args: IpcPayloads["endgame:ask"]) =>
    ipcRenderer.invoke("endgame:ask", args) as Promise<IpcResponses["endgame:ask"]>,

  // Advanced analysis – deep LLM pass
  deepAnalyzeLines: (payload: { fen: string; lines: any[] }) =>
    ipcRenderer.invoke("analysis:deep", payload),

  // Position notes
  notesGet: (fen: string) =>
    ipcRenderer.invoke("notes:get", { fen }) as Promise<string | null>,
  notesSet: (fen: string, text: string) =>
    ipcRenderer.invoke("notes:set", { fen, text }) as Promise<void>,

  // PGN save / load
  saveAnalysisPgn: (payload: { pgn: string; notes: Record<string, string> }) =>
    ipcRenderer.invoke("analysis:save-pgn", payload) as Promise<{ ok: boolean; path?: string; error?: string }>,
  exportAnalysisPgn: (payload: { pgn: string }) =>
    ipcRenderer.invoke("analysis:export-pgn", payload) as Promise<{ ok: boolean; path?: string; cancelled?: boolean; error?: string }>,
  loadAnalysisPgn: () =>
    ipcRenderer.invoke("analysis:load-pgn") as Promise<{ ok: boolean; pgn?: string; notes?: Record<string, string>; cancelled?: boolean; error?: string }>,
  onDbProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("db:progress", handler);
    return () => ipcRenderer.removeListener("db:progress", handler);
  },
  onDbRefreshStatus: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("db:refresh-status", handler);
    return () => ipcRenderer.removeListener("db:refresh-status", handler);
  },
  onDbImportComplete: (callback: (data: { ok: boolean; count?: number; error?: string }) => void) => {
    const handler = (_event: any, data: { ok: boolean; count?: number; error?: string }) => callback(data);
    ipcRenderer.on("db:import-complete", handler);
    return () => ipcRenderer.removeListener("db:import-complete", handler);
  },

  // OTB directory bulk import
  browseOtbDir: () =>
    ipcRenderer.invoke("db:browse-otb-dir") as Promise<{ dirPath: string | null }>,
  importOtbDir: (dirPath: string) =>
    ipcRenderer.invoke("db:import-otb-dir", { dirPath }) as Promise<{ ok: boolean; started?: boolean; imported?: number; skipped?: number; errors?: number; error?: string }>,
  onOtbDirProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("db:otb-dir-progress", handler);
    return () => ipcRenderer.removeListener("db:otb-dir-progress", handler);
  },
  onOtbDirComplete: (callback: (data: { ok: boolean; imported: number; skipped: number; errors: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("db:otb-dir-complete", handler);
    return () => ipcRenderer.removeListener("db:otb-dir-complete", handler);
  },

  // Window controls
  minimizeWindow: () =>
    ipcRenderer.invoke("app:minimize-window") as Promise<void>,
  maximizeWindow: () =>
    ipcRenderer.invoke("app:maximize-window") as Promise<void>,
  closeWindow: () =>
    ipcRenderer.invoke("app:close-window") as Promise<void>,
} as ElectronAPI);
