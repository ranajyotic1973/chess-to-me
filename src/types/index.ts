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
  engineTimeoutMs?: number;
  explainLanguage: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  llmProvider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
  llmApiKey: string;
  llmModel?: string; // For non-Ollama providers (openai, anthropic, gemini, grok)
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
    llmApiKey?: string;
    llmApiKeyLength: number;
    llmModel?: string; // For non-Ollama providers
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

export type ResponseType = "Analysis" | "Puzzle" | "Position" | "Game";

export interface AgentProgressEvent {
  agentId: number;       // 1-based
  lineIndex: number;     // 0-based
  lineLabel: string;     // "Line 1: e4 e5 Nf3..."
  status: "working" | "done" | "error";
  response?: string;
  error?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: number;
}

export interface GameMemoryEntry {
  pgn: string;
  annotations: Record<number, "!!" | "!" | "*" | "!?" | "??">;
  timestamp: number;
}

export interface LLMResponse {
  ok: boolean;
  response_type?: ResponseType;
  type?: ResponseType;
  answer?: string;
  explanation?: string;
  fen?: string;
  solution?: string[];
  hidden_solution?: boolean;
  lines?: AnalysisLine[];
  annotations?: Record<number, "!!" | "!" | "*" | "!?" | "??">;
  error?: string;
}

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
// LLM Tool Calling Types
// ============================================================================

export interface MoveValidationResult {
  valid: boolean;
  reason?: string;
}

export interface BoardAnalysisResult extends AnalysisResult {
  fen: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments?: Record<string, any>;
}

export interface ToolResult {
  tool_use_id?: string;
  toolName?: string;
  type: "tool_result";
  content: string | Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMToolCall {
  toolName: string;
  arguments: Record<string, any>;
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
    responseType?: ResponseType;
    conversationHistory?: ConversationMessage[];
  };
  setOllamaModel: string;
  getAvailableModels: {
    provider: "ollama" | "openai" | "anthropic" | "gemini" | "grok";
    apiKey?: string;
    baseUrl?: string;
  };
  validateMove: { from: string; to: string };
  applyMove: { from: string; to: string };
  getBoardFen: Record<string, never>;
  getLegalMoves: Record<string, never>;
  analyzeBoardPosition: { fen?: string; depth?: number };
  "db:status": Record<string, never>;
  "db:download-puzzles": Record<string, never>;
  "db:check-puzzle-update": Record<string, never>;
  "db:browse-games-file": Record<string, never>;
  "db:import-games-7z": { filePath: string };
  "db:search-puzzles": PuzzleSearchParams;
  "db:search-games": GameSearchParams;
  "db:delete-puzzles": Record<string, never>;
  "db:delete-games": Record<string, never>;
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
  validateMove: { valid: boolean; reason?: string };
  applyMove: { ok: boolean; fen?: string; error?: string };
  getBoardFen: { fen: string };
  getLegalMoves: { moves: string[] };
  analyzeBoardPosition: { ok: boolean; analysis?: AnalysisResult; error?: string };
  "db:status": DbStatus;
  "db:download-puzzles": { ok: boolean; count?: number; error?: string };
  "db:check-puzzle-update": { hasUpdate: boolean; serverDate: string };
  "db:browse-games-file": { filePath: string | null };
  "db:import-games-7z": { ok: boolean; count?: number; error?: string };
  "db:search-puzzles": PuzzleRow[];
  "db:search-games": GameRow[];
  "db:delete-puzzles": { ok: boolean };
  "db:delete-games": { ok: boolean };
}

// ============================================================================
// Database Types
// ============================================================================

export interface PuzzleRow {
  puzzle_id: string;
  fen: string;
  moves: string;
  rating: number;
  rating_deviation: number;
  popularity: number;
  nb_plays: number;
  themes: string;
  game_url: string;
  opening_tags: string;
}

export interface GameRow {
  game_id: number;
  white: string;
  black: string;
  result: string;
  white_elo: number;
  black_elo: number;
  eco: string;
  opening: string;
  date: string;
  event: string;
  pgn_moves: string;
}

export interface PuzzleDbStats {
  count: number;
  sizeBytes: number;
  version: string;
}

export interface GamesDbStats {
  count: number;
  sizeBytes: number;
  source: string;
}

export interface DbStatus {
  puzzles: PuzzleDbStats | null;
  games: GamesDbStats | null;
}

export interface DbProgressEvent {
  phase: "downloading" | "decompressing" | "importing";
  percent: number;
  message: string;
}

export interface PuzzleSearchParams {
  theme?: string;
  minRating?: number;
  maxRating?: number;
  opening?: string;
  limit?: number;
}

export interface GameSearchParams {
  player?: string;
  eco?: string;
  minElo?: number;
  limit?: number;
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
  onMoveAttempt?: (from: string, to: string, fen: string) => void;
  size?: { width: number; height: number };
  onStartAnalysis?: () => void;
  onStopAnalysis?: () => void;
  isAnalysisRunning?: boolean;
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
  onMoveSuggested?: (from: string, to: string) => void;
  llmProvider?: string;
  analysisLines?: AnalysisLine[];
  onSelectEngineLine?: (lineIndex: number, line: AnalysisLine) => void;
  selectedEngineLineIndex?: number | null;
  currentMoveIndex?: number;
  responseType?: ResponseType;
  responseData?: Record<string, any>;
  showSolution?: boolean;
  onShowSolution?: () => void;
  agentStatuses?: AgentProgressEvent[];
  isExplanationLoading?: boolean;
  puzzleNavigationMode?: boolean;
  sx?: any;
}

export interface SettingsPanelProps {
  formState: FormState;
  onFieldChange: (key: string, value: string | number) => void;
  onDetect: () => void;
  onDetectAll: () => void;
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
  onLogEntry(callback: (data: { bucket: "stockfish" | "ollama"; entry: LogEntry }) => void): () => void;
  onAgentProgress(callback: (data: AgentProgressEvent) => void): () => void;
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

  // LLM Chess Tools
  validateMove(options: { from: string; to: string }): Promise<MoveValidationResult>;
  applyMove(options: { from: string; to: string }): Promise<{ ok: boolean; fen?: string; error?: string }>;
  getBoardFen(): Promise<{ fen: string }>;
  getLegalMoves(): Promise<{ moves: string[] }>;
  analyzeBoardPosition(options: { fen?: string; depth?: number }): Promise<{ ok: boolean; analysis?: AnalysisResult; error?: string }>;

  // Database
  dbStatus(): Promise<DbStatus>;
  dbDownloadPuzzles(): Promise<{ ok: boolean; count?: number; error?: string }>;
  dbCheckPuzzleUpdate(): Promise<{ hasUpdate: boolean; serverDate: string }>;
  dbBrowseGamesFile(): Promise<{ filePath: string | null }>;
  dbImportGames7z(filePath: string): Promise<{ ok: boolean; count?: number; error?: string }>;
  dbSearchPuzzles(params: PuzzleSearchParams): Promise<PuzzleRow[]>;
  dbSearchGames(params: GameSearchParams): Promise<GameRow[]>;
  dbDeletePuzzles(): Promise<{ ok: boolean }>;
  dbDeleteGames(): Promise<{ ok: boolean }>;
  onDbProgress(callback: (data: DbProgressEvent) => void): () => void;
  onDbRefreshStatus(callback: () => void): () => void;
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
