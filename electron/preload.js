const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Engine detection and browsing
  detectEngine: (options) => ipcRenderer.invoke("detectEngine", options),
  browseForEngine: (options) => ipcRenderer.invoke("browseForEngine", options),

  // Legacy API for backward compatibility
  detectStockfish: () => ipcRenderer.invoke("detectEngine", { engine: "stockfish" }),
  browseStockfish: () => ipcRenderer.invoke("browseForEngine", { engine: "stockfish" }),

  // Engine configuration
  setEnginePath: (options) => ipcRenderer.invoke("setEnginePath", options),
  getEngineStatus: () => ipcRenderer.invoke("getEngineStatus"),

  // Analysis
  analyzePosition: (payload) => ipcRenderer.invoke("analyzePosition", payload),

  // Settings
  updateAppSettings: (payload) => ipcRenderer.invoke("app:update-settings", payload),

  // LLM
  explainLines: (payload) => ipcRenderer.invoke("ollama:explain-lines", payload),
  askQuestion: (payload = {}) => {
    const { userMessage, question, ...rest } = payload;
    return ipcRenderer.invoke("ollama:ask-question", { userMessage, question, ...rest });
  },

  // Logging and state
  getProcessLogs: () => ipcRenderer.invoke("process:get-logs"),
  setOllamaModel: (model) => ipcRenderer.invoke("process:set-model", model),

  // System info
  openExternalUrl: (url) => ipcRenderer.invoke("app:open-external", url),
  getSystemStatus: () => ipcRenderer.invoke("app:system-check")
});
