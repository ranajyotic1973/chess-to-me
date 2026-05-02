/**
 * Central type definitions for chess-to-me application
 * Used across renderer (React) and main process (Electron)
 */

// ============================================================================
// Engine Evaluation Types
// ============================================================================

export type Score =
  | { type: "cp"; value: number; depth?: number }
  | { type: "mate"; value: number; depth?: number }
  | { winProb: number; depth?: number };

export interface NormalizedEvaluation {
  description: string;
  cpValue?: number;
  mateValue?: number;
  winProbValue?: string;
  type: "centipawn" | "mate" | "win_probability" | "unknown";
  confidence: "high" | "medium" | "low";
  raw?: unknown;
}

// ============================================================================
// Analysis Data Types
// ============================================================================

export interface AnalysisLine {
  rank?: number;
  score: Score | null;
  pv?: string;
  line?: string;
  text?: string;
  id?: string;
}

export interface AnalysisResult {
  bestMove: string;
  lines: AnalysisLine[];
}

export interface Move {
  from: string;
  to: string;
}

/**
 * UI-enriched analysis entry
 * Produced by parseStockfishLine() - contains human-readable data
 */
export interface AnalysisEntry {
  id: string;
  rank: number;
  rawText: string;
  cleanText: string;
  moves: Move[];
  scoreLabel: string | null;
  description: string;
  llmUserMessage: string;
}

// ============================================================================
// Settings & Configuration
// ============================================================================

export interface AppSettings {
  stockfishPath: string;
  lc0Path: string;
  selectedEngine: "stockfish" | "lc0";
  analysisDepth: number;
  explainLanguage: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  llmProvider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
  llmApiKey: string;
}

export type FormState = AppSettings;

export interface EngineInfo {
  name: "stockfish" | "lc0";
  path: string;
  status: "installed" | "not-found";
}

// ============================================================================
// IPC Response Types
// ============================================================================

export interface EngineStatus {
  selectedEngine: string;
  stockfishPath: string;
  lc0Path: string;
  configured: boolean;
  settings: {
    analysisDepth: number;
    explainLanguage: string;
    ollamaModel: string;
    ollamaBaseUrl: string;
    llmProvider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    llmApiKeyLength: number;
  };
}

export interface SystemStatus {
  platform: string;
  ollamaRunning: boolean;
  qwen3Installed: boolean;
  stockfishFound: boolean;
  stockfishPath: string;
  lc0Found: boolean;
  lc0Path: string;
  availableModels: string[];
  activeModel: string;
  ollamaRunActive: boolean;
  lastModelError: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr";
  text: string;
  context?: string;
  engine?: string;
  model?: string;
  note?: string;
}

export interface ProcessLogs {
  stockfish: LogEntry[];
  ollama: LogEntry[];
  activeModel: string;
  lastModelError: string;
}

// ============================================================================
// LLM Types
// ============================================================================

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatResponse {
  ok: boolean;
  answer?: string;
  explanations?: Array<{ rank: number; text: string }>;
  linesUsed?: number;
  error?: string;
}

// ============================================================================
// Electron IPC Types
// ============================================================================

export interface IpcPayloads {
  detectEngine: { engine: string };
  browseForEngine: { engine: string };
  setEnginePath: { engine: string; path: string };
  analyzePosition: { engine?: string; fen: string; depth?: number; multiPv?: number };
  updateAppSettings: Partial<AppSettings>;
  explainLines: {
    lines: AnalysisLine[];
    fen?: string;
    language?: string;
    model?: string;
    baseUrl?: string;
    llmProvider?: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    llmApiKey?: string;
  };
  askQuestion: {
    question?: string;
    userMessage?: string;
    fen?: string;
    boardFen?: string;
    lines?: AnalysisLine[];
    language?: string;
    model?: string;
    baseUrl?: string;
    engine?: string;
    depth?: number;
    systemPrompt?: string;
    llmProvider?: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    llmApiKey?: string;
  };
  setOllamaModel: string;
  getAvailableModels: {
    provider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    apiKey?: string;
    baseUrl?: string;
  };
}

export interface IpcResponses {
  detectEngine: { found: boolean; path: string };
  browseForEngine: { selected: boolean; valid?: boolean; path: string };
  setEnginePath: { ok: boolean; path?: string };
  getEngineStatus: EngineStatus;
  analyzePosition: { ok: boolean; analysis?: AnalysisResult; error?: string };
  updateAppSettings: { ok: boolean; settings?: Partial<AppSettings> };
  getProcessLogs: ProcessLogs;
  explainLines: { ok: boolean; explanations?: Array<{ rank: number; text: string }>; error?: string };
  askQuestion: { ok: boolean; answer?: string; linesUsed?: number; error?: string };
  setOllamaModel: { ok: boolean; activeModel?: string; error?: string };
  openExternalUrl: { ok: boolean };
  getSystemStatus: SystemStatus;
  getAvailableModels: { ok: boolean; models?: string[]; error?: string };
}

// ============================================================================
// React Component Props
// ============================================================================

export interface AnalysisBoardProps {
  currentFen: string;
  setCurrentFen: (fen: string) => void;
  runAnalysis: (fen: string) => void;
  setStatusMessage: (msg: string) => void;
  onBoardMove?: (fen: string) => void;
  size?: { width: number; height: number };
}

export interface StatusBannerProps {
  statusMessage: string;
  analysisStatus: string;
}

export interface ChatPanelProps {
  questionText: string;
  onQuestionChange: (value: string) => void;
  onAskQuestion: () => void;
  questionLoading: boolean;
  questionResponse: string;
  onClearQuestion: () => void;
  onOpenSettings: () => void;
  analysisEntries?: AnalysisEntry[];
  analysisStatus: string;
  analysisLoading: boolean;
  onPlayLine?: (moves: Move[]) => void;
  selectedAnalysisId: string | null;
  onLineSelect?: (entry: AnalysisEntry) => void;
  sx?: any;
}

export interface SettingsPanelProps {
  formState: FormState;
  onFieldChange: (key: string, value: string | number) => void;
  onDetect: () => void;
  onBrowse: () => void;
  onSaveSettings: () => void;
  onSettingsComplete: () => void;
  settingsSaving: boolean;
  engineStatus: EngineStatus | null;
  statusMessage: string;
  systemStatus: SystemStatus | null;
  sx?: any;
  availableEngines?: EngineInfo[];
  selectedEngine?: string;
  onEngineChange?: (engineName: string) => void;
  llmApiKeyLength?: number;
}

// ============================================================================
// Electron API Interface (exposed via preload.js)
// ============================================================================

export interface ElectronAPI {
  // Engine detection
  detectEngine(options: { engine: string }): Promise<{ found: boolean; path: string }>;
  browseForEngine(options: { engine: string }): Promise<{ selected: boolean; valid?: boolean; path: string }>;
  detectStockfish(): Promise<{ found: boolean; path: string }>;
  browseStockfish(): Promise<{ selected: boolean; valid?: boolean; path: string }>;

  // Engine configuration
  setEnginePath(options: { engine: string; path: string }): Promise<{ ok: boolean; path?: string }>;
  getEngineStatus(): Promise<EngineStatus>;

  // Engine operations (internal use)
  ensureEngineRunning(options: { engine: string; path: string }): Promise<void>;
  stopEngine(options: { engine: string }): Promise<void>;
  discoverEngines(): Promise<{ stockfish: string | null; lc0: string | null }>;
  validateEngine(options: { engine: string; path: string }): Promise<{ valid: boolean }>;

  // Analysis
  analyzePosition(payload: {
    engine?: string;
    fen: string;
    depth?: number;
    multiPv?: number;
  }): Promise<{ ok: true; analysis: AnalysisResult } | { ok: false; error: string }>;

  // Settings
  updateAppSettings(payload: Partial<AppSettings>): Promise<{ ok: true; settings: Partial<AppSettings> }>;

  // LLM
  explainLines(payload: {
    lines: AnalysisLine[];
    fen?: string;
    language?: string;
    model?: string;
    baseUrl?: string;
    llmProvider?: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    llmApiKey?: string;
  }): Promise<{ ok: true; explanations: Array<{ rank: number; text: string }> } | { ok: false; error: string }>;

  askQuestion(payload?: {
    userMessage?: string;
    question?: string;
    fen?: string;
    boardFen?: string;
    lines?: AnalysisLine[];
    language?: string;
    model?: string;
    baseUrl?: string;
    engine?: string;
    depth?: number;
    systemPrompt?: string;
    llmProvider?: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    llmApiKey?: string;
  }): Promise<{ ok: true; answer: string; linesUsed: number } | { ok: false; error: string }>;

  // Logging
  getProcessLogs(): Promise<ProcessLogs>;
  setOllamaModel(model: string): Promise<{ ok: true; activeModel: string } | { ok: false; error: string }>;

  // LLM Model Management
  getAvailableModels(payload: {
    provider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    apiKey?: string;
    baseUrl?: string;
  }): Promise<{ ok: true; models: string[] } | { ok: false; error: string }>;

  // System
  openExternalUrl(url: string): Promise<{ ok: boolean }>;
  getSystemStatus(): Promise<SystemStatus>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    Chessboard: any;
    ChessBoard: any;
    $: any;
    jQuery: any;
  }
}

export {};
