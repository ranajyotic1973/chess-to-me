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

  // Settings
  updateAppSettings: (payload: IpcPayloads["updateAppSettings"]) =>
    ipcRenderer.invoke("app:update-settings", payload) as Promise<IpcResponses["updateAppSettings"]>,

  // LLM
  explainLines: (payload: IpcPayloads["explainLines"]) =>
    ipcRenderer.invoke("llm:explain-lines", payload) as Promise<IpcResponses["explainLines"]>,
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

  setOllamaModel: (model: string) =>
    ipcRenderer.invoke("process:set-model", model) as Promise<IpcResponses["setOllamaModel"]>,

  // System info
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("app:open-external", url) as Promise<IpcResponses["openExternalUrl"]>,
  getSystemStatus: () =>
    ipcRenderer.invoke("app:system-check") as Promise<IpcResponses["getSystemStatus"]>,

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
  }
} as ElectronAPI);
