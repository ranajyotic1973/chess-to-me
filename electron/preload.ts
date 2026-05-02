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
    ipcRenderer.invoke("ollama:explain-lines", payload) as Promise<IpcResponses["explainLines"]>,
  askQuestion: (payload?: IpcPayloads["askQuestion"]) => {
    const { userMessage, question, ...rest } = payload || {};
    return ipcRenderer.invoke("ollama:ask-question", { userMessage, question, ...rest }) as Promise<IpcResponses["askQuestion"]>;
  },
  getAvailableModels: (payload: IpcPayloads["getAvailableModels"]) =>
    ipcRenderer.invoke("getAvailableModels", payload) as Promise<IpcResponses["getAvailableModels"]>,

  // Logging and state
  getProcessLogs: () =>
    ipcRenderer.invoke("process:get-logs") as Promise<IpcResponses["getProcessLogs"]>,
  setOllamaModel: (model: string) =>
    ipcRenderer.invoke("process:set-model", model) as Promise<IpcResponses["setOllamaModel"]>,

  // System info
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("app:open-external", url) as Promise<IpcResponses["openExternalUrl"]>,
  getSystemStatus: () =>
    ipcRenderer.invoke("app:system-check") as Promise<IpcResponses["getSystemStatus"]>
} as ElectronAPI);
