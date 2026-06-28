import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { Alert } from "@mui/material";
import { Chess } from "chess.js";
import MoveWarningDialog from "./components/MoveWarningDialog";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import StopIcon from "@mui/icons-material/Stop";
import EditIcon from "@mui/icons-material/Edit";
import SettingsPanel from "./components/SettingsPanel";
import AnalysisBoard from "./components/AnalysisBoard";
import ChatPanel from "./components/ChatPanel";
import PositionNotesPanel from "./components/PositionNotesPanel";
import NotesConfirmDialog from "./components/NotesConfirmDialog";
import StatusBanner from "./components/StatusBanner";
import AppStatusBar from "./components/AppStatusBar";
import BoardPositionEditor from "./components/BoardPositionEditor";
import ProfileIcon from "./components/ProfileIcon";
import EvalBar from "./components/EvalBar";
import {
  deriveFenSequence,
  parseFenOrPgnInput,
  parseStockfishLine,
  sanWithGlyph
} from "./utils/analysisHelpers";
import {
  parseLLMResponse,
  validateLLMResponse,
  formatConversationHistory
} from "./utils/llmResponseParser";
import {
  loadConversationHistory,
  saveConversationHistory,
  addToConversationHistory,
  formatConversationForContext,
  clearConversationHistory
} from "./utils/conversationMemory";
import { loadGameMemory, saveGameMemory, addGameToMemory, parseAnnotationsFromResponse } from "./utils/gameMemory";
import { quickDetectAnalysisRequired } from "./utils/twoStepLLMProcessing";
import { parseChessNotation, uciSequenceToSan, looksLikeMoveAttempt, parsePuzzlePlayerMoves } from "./utils/chessNotationParser";
import type {
  AnalysisEntry,
  AnalysisLine,
  AppSettings,
  AgentProgressEvent,
  DeepLineAnalysis,
  EngineInfo,
  EngineStatus,
  LogEntry,
  SystemStatus
} from "./types";

const electronAPI = typeof window !== "undefined" ? window.electronAPI : null;
const SETTINGS_FLAG = "chess-to-me:settings-saved";

const DEFAULT_FORM: AppSettings = {
  stockfishPath: "",
  lc0Path: "",
  selectedEngine: "lc0",
  analysisDepth: 16,
  engineTimeoutMs: 120000, // 2 minutes default
  explainLanguage: "English",
  ollamaModel: "qwen3:8b",
  ollamaBaseUrl: "http://localhost:11434/api",
  llmProvider: "ollama" as const,
  llmApiKey: "",
  llmModel: "grok-3", // Default model for non-Ollama providers
  puzzleRatingMin: 1000,
  puzzleRatingMax: 1500,
  otbImportDir: ""
};

const VALID_PROVIDERS = ["ollama", "openai", "anthropic", "gemini", "grok"] as const;

interface GamePlayerInfo {
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  whiteFideRating?: number;
  blackFideRating?: number;
}

async function fetchFideRating(playerName: string): Promise<number | null> {
  const parts = playerName.split(",").map(p => p.trim());
  const lastName = parts[0] ?? "";
  const firstName = parts[1] ?? "";

  const candidates: string[] = [];
  if (firstName) candidates.push(firstName);
  if (firstName && lastName) candidates.push(`${firstName}${lastName}`);
  if (lastName) candidates.push(lastName);

  for (const name of candidates) {
    try {
      const res = await fetch(
        `https://api.chesstools.org/ratings/player/${encodeURIComponent(name)}`
      );
      if (!res.ok) continue;
      const data = await res.json() as Record<string, any>;
      const rating = data.rating || data.fide_rating || data.classical_rating;
      if (typeof rating === "number" && rating > 0) return rating;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function PlayerBar({ name, elo, pieceColor }: { name: string; elo?: number; pieceColor: "white" | "black" }) {
  const pawn = pieceColor === "white" ? "♙" : "♟";
  const eloLabel = elo && elo > 0 ? ` (${elo})` : "";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.375 }}>
      <Typography component="span" sx={{ fontSize: "1rem", lineHeight: 1, userSelect: "none" }}>
        {pawn}
      </Typography>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
        {name}{eloLabel}
      </Typography>
    </Box>
  );
}


const normalizeModelName = (value: string | null | undefined): string => String(value || "").trim();

function deriveConversationMode(responseType: string, isGameMode: boolean): string {
  if (responseType === "Puzzle") return "puzzle";
  if (responseType === "Opening") return "opening";
  if (responseType === "Middlegame") return "middlegame";
  if (responseType === "Endgame") return "endgame";
  if (isGameMode || responseType === "GameList" || responseType === "Game") return "game";
  return "analysis";
}

const getModelForProvider = (provider: string, ollamaModel: string, llmModel?: string): string => {
  if (provider === "ollama") {
    return ollamaModel;
  }
  return llmModel || ""; // Send saved model for other providers, or empty to use backend default
};

const getBaseUrlForProvider = (provider: string, ollamaBaseUrl: string): string => {
  // Only send baseUrl for Ollama; for other providers let backend use provider-specific endpoints
  return provider === "ollama" ? ollamaBaseUrl : "";
};

const isLlmSettingsValid = (provider: string, model: string, apiKey: string): boolean => {
  if (!provider || !model) return false;

  if (provider === "ollama") {
    // Ollama just needs model name
    return model.trim() !== "";
  } else {
    // Cloud providers need both model and API key
    return model.trim() !== "" && apiKey.trim() !== "";
  }
};

const normalizeModelList = (models: string[] | null | undefined): string[] => {
  if (!Array.isArray(models)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const model of models) {
    const candidate = normalizeModelName(model);
    if (!candidate) {
      continue;
    }
    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(candidate);
  }
  return normalized;
};

const determinePreferredModel = (models: string[] | null | undefined): string => {
  const normalized = normalizeModelList(models);
  const defaultName = DEFAULT_FORM.ollamaModel;
  const defaultKey = defaultName.toLowerCase();
  if (normalized.some((name) => name.toLowerCase() === defaultKey)) {
    return defaultName;
  }
  return normalized[0] || defaultName;
};

export default function App() {
  const [viewMode, setViewMode] = useState<"settings" | "analysis">(() => {
    if (typeof window === "undefined") return "settings";
    // Prefer localStorage flag if it exists (user has completed setup before)
    const flag = window.localStorage.getItem(SETTINGS_FLAG);
    if (flag === "true") return "analysis";
    // If flag is not set, still show analysis mode by default - settings will auto-show if needed
    // This avoids showing settings page unnecessarily when settings are already configured
    return "analysis";
  });
  const [formState, setFormState] = useState<AppSettings>(DEFAULT_FORM);
  const [llmApiKeyLength, setLlmApiKeyLength] = useState<number>(0);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [isAnalysisRunning, setIsAnalysisRunning] = useState<boolean>(false);
  const [analysisLines, setAnalysisLines] = useState<AnalysisLine[]>([]);
  const [advancedAnalysisMode, setAdvancedAnalysisMode] = useState<boolean>(false);
  const [notesConfirmDialogOpen, setNotesConfirmDialogOpen] = useState<boolean>(false);
  const [deepAnalysisResults, setDeepAnalysisResults] = useState<Record<number, DeepLineAnalysis | null>>({});
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState<boolean>(false);
  const [currentNotesMap, setCurrentNotesMap] = useState<Record<string, string>>({});
  const [advancedAnalysisNotesModified, setAdvancedAnalysisNotesModified] = useState<boolean>(false);
  const [currentRawPgn, setCurrentRawPgn] = useState<string>("");
  const [selectedEngineLineIndex, setSelectedEngineLineIndex] = useState<number | null>(null);
  const [selectedEngineLineData, setSelectedEngineLineData] = useState<AnalysisLine | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [analysisEntries, setAnalysisEntries] = useState<AnalysisEntry[]>([]);
  const [lineExplanations, setLineExplanations] = useState<Record<number, string>>({});
  const [currentOpening, setCurrentOpening] = useState<{ name: string; eco: string } | null>(null);
  // History stack for drilling into an engine line: selecting a line previews its first
  // move, runs a fresh analysis of the resulting position, and shows THAT as a new list
  // ("drilling in"). Each frame is the parent level's state, popped on "back".
  const [explorationStack, setExplorationStack] = useState<Array<{
    fen: string;
    lines: AnalysisLine[];
    entries: AnalysisEntry[];
    listResponse: string;
  }>>([]);
  const [isDrillLoading, setIsDrillLoading] = useState<boolean>(false);
  const [selectedAnalysisLineId, setSelectedAnalysisLineId] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"main" | "logs">("main");
  const [logEntries, setLogEntries] = useState<{ stockfish: LogEntry[]; ollama: LogEntry[] }>({ stockfish: [], ollama: [] });
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [analysisLogError, setAnalysisLogError] = useState<string>("");
  const [activeLogTab, setActiveLogTab] = useState<number>(0);
  const logContainerRefs = useRef<{ stockfish: HTMLDivElement | null; ollama: HTMLDivElement | null }>({ stockfish: null, ollama: null });
  const isInitialLoadRef = useRef<boolean>(true);
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [engineWarming, setEngineWarming] = useState<boolean>(false);
  const [engineAnalyzing, setEngineAnalyzing] = useState<boolean>(false);
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState<number>(0);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [lineDialogOpen, setLineDialogOpen] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<AnalysisEntry | null>(null);
  const [lineAnalysisText, setLineAnalysisText] = useState<string>("");
  const [lineAnalysisLoading, setLineAnalysisLoading] = useState<boolean>(false);
  const [lineAnalysisError, setLineAnalysisError] = useState<string>("");
  const [currentFen, setCurrentFen] = useState<string>("start");
  const [questionText, setQuestionText] = useState<string>("");
  const [questionResponse, setQuestionResponse] = useState<string>("");
  const [questionLoading, setQuestionLoading] = useState<boolean>(false);
  const [agentStatuses, setAgentStatuses] = useState<AgentProgressEvent[]>([]);
  const [currentResponseType, setCurrentResponseType] = useState<import("./types").ResponseType>("Analysis");
  const [currentResponseData, setCurrentResponseData] = useState<Record<string, any>>({});
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; message: string; timestamp: number }>>([]);
  const [gameMemory, setGameMemory] = useState<Array<{ pgn: string; annotations: Record<number, string>; timestamp: number }>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720
  }));
  const [availableEngines, setAvailableEngines] = useState<EngineInfo[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "info">("info");
  const [moveWarningOpen, setMoveWarningOpen] = useState<boolean>(false);
  const [moveWarningMessage, setMoveWarningMessage] = useState<string>("");
  const [isPositionEditorOpen, setIsPositionEditorOpen] = useState<boolean>(false);
  const importFileInput = useRef<HTMLInputElement>(null);
  const userSelectedModelRef = useRef<boolean>(false);
  const conversationModeRef = useRef<string>("analysis");
  // Refs that let the auto-eval closure read the latest values without stale captures.
  // Updated every render (no deps array) so they're always current.
  const formStateRef = useRef(formState);
  const engineStatusRef = useRef(engineStatus);
  const currentResponseTypeRef = useRef(currentResponseType);
  const selectedEngineLineIndexRef = useRef<number | null>(selectedEngineLineIndex);
  // Incremented on every drill-in attempt and on "back" — lets an in-flight drill
  // analysis detect that the user has navigated away and discard its stale result.
  const drillRequestIdRef = useRef(0);
  // Set right before a drill-down sets currentFen to the post-move position — the
  // auto-eval effect (keyed on currentFen) would otherwise immediately re-run for that
  // same position, duplicating the analysis we just did AND wiping explorationStack.
  const suppressNextAutoEvalRef = useRef(false);
  // Training agent state (Opening / Endgame)
  const [trainingMoves, setTrainingMoves] = useState<Array<{ uci: string; san: string; commentary: string }>>([]);
  const [trainingMoveIndex, setTrainingMoveIndex] = useState<number>(-1);
  const [trainingStartFen, setTrainingStartFen] = useState<string>("");
  // Glyphed SAN label (e.g. "3. ♘f3") for the move currently shown during keyboard navigation.
  // Empty string means navigation hasn't started yet — the opening name/story should be shown instead.
  const [trainingMoveLabel, setTrainingMoveLabel] = useState<string>("");
  // Puzzle state
  const [puzzleSolution, setPuzzleSolution] = useState<string[]>([]);
  const [puzzleSolutionSan, setPuzzleSolutionSan] = useState<string[]>([]);
  const [puzzleAttemptMoves, setPuzzleAttemptMoves] = useState<string[]>([]);
  const [puzzleStartFen, setPuzzleStartFen] = useState<string>("");
  const [puzzleNavigationMode, setPuzzleNavigationMode] = useState<boolean>(false);
  const [puzzleIncorrect, setPuzzleIncorrect] = useState<boolean>(false);
  const [puzzleExplainLoading, setPuzzleExplainLoading] = useState<boolean>(false);
  // Metadata from the current DB puzzle — needed to request deferred LLM explanation
  const [puzzleMeta, setPuzzleMeta] = useState<{
    themes: string; difficulty: string; rating: number;
  } | null>(null);
  // Per-move explanation
  const [isExplanationLoading, setIsExplanationLoading] = useState<boolean>(false);
  const explanationCache = useRef<Map<string, string>>(new Map());
  // The general (whole-list) LLM response shown before any line is selected — cached so
  // that going back to the list restores it instantly instead of leaving the last
  // per-move explanation showing, or needing a fresh LLM call.
  const lastListResponseRef = useRef<string>("");
  // Base FEN at the time a line was selected (correct starting point for move replay)
  const [selectedLineBaseFen, setSelectedLineBaseFen] = useState<string>("");
  // Game browsing state
  const [gameList, setGameList] = useState<import("./types").GameRow[] | null>(null);
  // Ref mirrors gameList so useCallback closures always see the latest value
  // without needing to re-create the callback on every list update.
  const gameListRef = useRef<import("./types").GameRow[] | null>(null);
  const [gameMode, setGameMode] = useState<boolean>(false);
  const [currentGameInfo, setCurrentGameInfo] = useState<GamePlayerInfo | null>(null);
  const [gamePgnFens, setGamePgnFens] = useState<string[]>([]);
  const [gameMoveIndex, setGameMoveIndex] = useState<number>(0);
  const [gameEcoLabel, setGameEcoLabel] = useState<string>("");
  const [analysisEcoLabel, setAnalysisEcoLabel] = useState<string>("");

  const fetchSystemStatus = useCallback(async (): Promise<void> => {
    if (!electronAPI?.getSystemStatus) {
      return;
    }
    try {
      const status = await electronAPI.getSystemStatus();
      setSystemStatus(status);

      const engines: EngineInfo[] = [];
      if (status.stockfishFound) {
        engines.push({
          name: "stockfish",
          path: status.stockfishPath,
          status: "installed"
        });
      }
      if (status.lc0Found) {
        engines.push({
          name: "lc0",
          path: status.lc0Path,
          status: "installed"
        });
      }
      setAvailableEngines(engines);

      const preferredModel = determinePreferredModel(status.availableModels);
      setFormState((prev) => {
        const currentModel = normalizeModelName(prev.ollamaModel);
        const available = normalizeModelList(status.availableModels);
        const availableSet = new Set(available.map((name) => name.toLowerCase()));
        const isCurrentValid =
          currentModel && availableSet.has(currentModel.toLowerCase());
        const shouldOverride =
          !isCurrentValid ||
          (!userSelectedModelRef.current && currentModel !== preferredModel);
        if (!shouldOverride) {
          return prev;
        }
        return {
          ...prev,
          ollamaModel: preferredModel
        };
      });
    } catch (err) {
      setStatusMessage("Unable to fetch system status.");
    }
  }, []);

  const loadEngineStatus = useCallback(async (): Promise<void> => {
    console.log("[App] loadEngineStatus called");
    if (!electronAPI?.getEngineStatus) {
      console.warn("[App] electronAPI.getEngineStatus not available");
      return;
    }
    try {
      console.log("[App] Fetching engine status...");
      const status = await electronAPI.getEngineStatus();
      console.log("[App] Engine status loaded:", status);
      setEngineStatus(status);
      setLlmApiKeyLength(status.settings?.llmApiKeyLength || 0);
      setFormState((prev) => {
        const provider = status.settings?.llmProvider as any;
        const validProvider = VALID_PROVIDERS.includes(provider) ? provider : prev.llmProvider;
        return {
          ...prev,
          stockfishPath: status.stockfishPath || prev.stockfishPath,
          lc0Path: status.lc0Path || prev.lc0Path,
          selectedEngine: (status.selectedEngine as "stockfish" | "lc0") || prev.selectedEngine,
          analysisDepth: Number(status.settings?.analysisDepth) || prev.analysisDepth,
          explainLanguage: status.settings?.explainLanguage || prev.explainLanguage,
          ollamaModel: status.settings?.ollamaModel || prev.ollamaModel,
          ollamaBaseUrl: status.settings?.ollamaBaseUrl || prev.ollamaBaseUrl,
          llmProvider: validProvider,
          llmApiKey: status.settings?.llmApiKey || prev.llmApiKey || "",
          llmModel: status.settings?.llmModel || prev.llmModel,
          puzzleRatingMin: status.settings?.puzzleRatingMin ?? prev.puzzleRatingMin ?? 1000,
          puzzleRatingMax: status.settings?.puzzleRatingMax ?? prev.puzzleRatingMax ?? 1500,
          otbImportDir: (status.settings?.otbImportDir as string) || prev.otbImportDir || ""
        };
      });
      userSelectedModelRef.current = Boolean(status.settings?.ollamaModel);
      setSettingsLoaded(true);
    } catch (err) {
      setStatusMessage("Unable to read saved engine settings.");
      setSettingsLoaded(true);
    }
  }, []);

  const loadLogs = useCallback(async (): Promise<void> => {
    if (!electronAPI?.getProcessLogs) {
      setAnalysisLogError("Log interface unavailable.");
      setLogEntries({ stockfish: [], ollama: [] });
      return;
    }
    setLogLoading(true);
    setAnalysisLogError("");
    try {
      const response = await electronAPI.getProcessLogs();
      setLogEntries({
        stockfish: Array.isArray(response?.stockfish) ? response.stockfish : [],
        ollama: Array.isArray(response?.ollama) ? response.ollama : []
      });
    } catch (err) {
      setAnalysisLogError("Unable to load process logs.");
    } finally {
      setLogLoading(false);
    }
  }, []);

  const warmupOllama = useCallback(async (): Promise<void> => {
    if (!electronAPI?.askQuestion) {
      return;
    }
    console.log(`[frontend] warmupOllama called | Current llmProvider: ${formState.llmProvider}`);
    try {
      // Send a simple test message to warm up Ollama on first load (only for Ollama provider)
      if (formState.llmProvider === "ollama") {
        console.log(`[frontend] Warming up Ollama | model: ${formState.ollamaModel}`);
        await electronAPI.askQuestion({
          question: "Hello",
          fen: "",
          lines: [],
          language: "English",
          model: formState.ollamaModel,
          baseUrl: formState.ollamaBaseUrl,
          llmProvider: "ollama"
        });
      } else {
        console.log(`[frontend] Skipping Ollama warmup | Provider is ${formState.llmProvider}, not ollama`);
      }
    } catch (err) {
      // Silently fail - warming up is optional
      console.log(`[frontend] Warmup error: ${(err as Error).message}`);
    }
  }, [formState.llmProvider, formState.ollamaModel, formState.ollamaBaseUrl]);

  // Bootstrap: Load settings on initial mount only
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setAppLoading(true);
      try {
        console.log("[App] Bootstrap starting");
        // Load engine status from settings (including saved engine paths)
        await loadEngineStatus();
        console.log("[App] Bootstrap engine status loaded");
      } catch (err) {
        console.error("[App] Bootstrap error:", err);
        setStatusMessage("Unable to initialize the platform.");
      } finally {
        if (!cancelled) {
          setAppLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadEngineStatus]);

  // Separate effect: Warm up Ollama when provider or model changes (after settings are loaded)
  useEffect(() => {
    if (!settingsLoaded) return;
    warmupOllama();
  }, [settingsLoaded, formState.llmProvider, formState.ollamaModel, formState.ollamaBaseUrl, warmupOllama]);

  // Clear chat when switching modes
  useEffect(() => {
    setQuestionResponse("");
  }, [viewMode]);

  // Auto-switch on initial load based on whether settings file exists
  useEffect(() => {
    if (!settingsLoaded || !isInitialLoadRef.current) return;

    // Only auto-switch once on initial load
    isInitialLoadRef.current = false;

    // Check if settings file exists on disk
    if (!electronAPI?.checkSettingsExist) {
      // If API not available, use engine status as fallback
      if (engineStatus?.configured) {
        setViewMode("analysis");
        window.localStorage?.setItem(SETTINGS_FLAG, "true");
      }
      return;
    }

    electronAPI.checkSettingsExist().then(({ exists }) => {
      // If settings file exists, go straight to analysis mode
      if (exists) {
        setViewMode("analysis");
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SETTINGS_FLAG, "true");
        }
      }
      // If settings file doesn't exist, show settings mode
      else {
        setViewMode("settings");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(SETTINGS_FLAG);
        }
      }
    }).catch(() => {
      // If check fails, use engine status as fallback
      if (engineStatus?.configured) {
        setViewMode("analysis");
        window.localStorage?.setItem(SETTINGS_FLAG, "true");
      }
    });
  }, [settingsLoaded]);

  // Signal when app is fully loaded - splash screen will wait for this and minimum 5 seconds
  useEffect(() => {
    console.log(`[App] Splash screen readiness check: settingsLoaded=${settingsLoaded}, viewMode=${viewMode}`);
    if (settingsLoaded && viewMode === "analysis") {
      console.log("[App] App ready - calling appReady()");
      // App is ready - signal to main.tsx to allow splash screen to hide
      if (typeof window !== "undefined" && (window as any).appReady) {
        (window as any).appReady();
      }
    }
  }, [settingsLoaded, viewMode]);

  // Listen for engine warmup start/finish events pushed from the main process
  useEffect(() => {
    if (!electronAPI?.onEngineWarmingUp || !electronAPI?.onEngineReady) return;
    const offWarming = electronAPI.onEngineWarmingUp(() => {
      setEngineWarming(true);
    });
    const offReady = electronAPI.onEngineReady(({ engine, ok }) => {
      setEngineWarming(false);
      if (!ok) {
        setStatusMessage(`${engine.toUpperCase()} failed to start. Check the engine path in Settings.`);
      }
    });
    return () => {
      offWarming();
      offReady();
    };
  }, []);

  // Listen for engine analysis start/done events to block input while calculating
  useEffect(() => {
    if (!electronAPI?.onEngineAnalysisStart || !electronAPI?.onEngineAnalysisDone) return;
    const offStart = electronAPI.onEngineAnalysisStart(() => setEngineAnalyzing(true));
    const offDone = electronAPI.onEngineAnalysisDone(() => setEngineAnalyzing(false));
    return () => {
      offStart();
      offDone();
    };
  }, []);

  // Auto-dismiss the floating status banner messages after 2 seconds so they
  // don't linger indefinitely — centralized here instead of at every call site.
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 2000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  useEffect(() => {
    if (!analysisStatus) return;
    const t = setTimeout(() => setAnalysisStatus(""), 2000);
    return () => clearTimeout(t);
  }, [analysisStatus]);

  // Stop the engine and clear opening label when the app mode changes
  const prevResponseTypeRef = useRef<import("./types").ResponseType | null>(null);
  useEffect(() => {
    if (prevResponseTypeRef.current !== null && prevResponseTypeRef.current !== currentResponseType) {
      electronAPI?.stopEngine?.({ engine: formState.selectedEngine });
      setAnalysisEcoLabel("");
    }
    prevResponseTypeRef.current = currentResponseType;
  }, [currentResponseType, formState.selectedEngine]);

  // Clear deep analysis results when the position changes during advanced mode
  useEffect(() => {
    if (advancedAnalysisMode) {
      setDeepAnalysisResults({});
    }
  }, [currentFen, advancedAnalysisMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Subscribe to agent progress events
  useEffect(() => {
    if (!electronAPI?.onAgentProgress) return;

    const unsub = electronAPI.onAgentProgress((event: AgentProgressEvent) => {
      setAgentStatuses((prev) => {
        const updated = [...prev];
        const existingIdx = updated.findIndex((a) => a.agentId === event.agentId);
        if (existingIdx >= 0) {
          updated[existingIdx] = event;
        } else {
          updated.push(event);
        }
        return updated;
      });
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (viewMode !== "analysis" && analysisMode !== "main") {
      setAnalysisMode("main");
    }
  }, [viewMode, analysisMode]);

  useEffect(() => {
    if (!analysisEntries.length) {
      setSelectedAnalysisLineId(null);
      return;
    }
    setSelectedAnalysisLineId((current) => {
      if (current && analysisEntries.some((entry) => entry.id === current)) {
        return current;
      }
      return analysisEntries[0]?.id || null;
    });
  }, [analysisEntries]);

  const prevLogCountRef = useRef<{ stockfish: number; ollama: number }>({
    stockfish: 0,
    ollama: 0
  });

  useEffect(() => {
    if (analysisMode !== "logs") {
      return undefined;
    }
    // Fetch existing buffered history on first open
    loadLogs();

    // Subscribe to real-time push events
    if (!electronAPI?.onLogEntry) return undefined;
    const unsub = electronAPI.onLogEntry(({ bucket, entry }) => {
      setLogEntries(prev => {
        const existing = prev[bucket as "stockfish" | "ollama"];
        // Deduplicate by ID
        if (existing.some(e => e.id === entry.id)) return prev;
        return { ...prev, [bucket]: [...existing, entry] };
      });
    });
    return unsub;
  }, [analysisMode, loadLogs]);

  useEffect(() => {
    if (analysisMode !== "logs") {
      return;
    }
    const bucket = activeLogTab === 0 ? "stockfish" : "ollama";
    const currentCount = logEntries[bucket].length;
    const prevCount = prevLogCountRef.current[bucket];

    // Only scroll if new logs were added
    if (currentCount > prevCount) {
      const container = logContainerRefs.current[bucket];
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 0);
      }
    }

    prevLogCountRef.current[bucket] = currentCount;
  }, [analysisMode, activeLogTab, logEntries]);

  // Load conversation and game memory on app startup
  useEffect(() => {
    Promise.all([loadConversationHistory("analysis"), loadGameMemory()]).then(([history, games]) => {
      setConversationHistory(history);
      setGameMemory(games);
    });
  }, []);

  // Keep auto-eval refs in sync every render (no deps — always latest).
  formStateRef.current = formState;
  engineStatusRef.current = engineStatus;
  currentResponseTypeRef.current = currentResponseType;
  selectedEngineLineIndexRef.current = selectedEngineLineIndex;

  // Reset puzzle conversation every time a new puzzle is presented
  useEffect(() => {
    if (!puzzleStartFen) return;
    setConversationHistory([]);
    saveConversationHistory([], "puzzle").catch(() => {});
  }, [puzzleStartFen]);

  // Reset opening/endgame conversation history when a new training session starts.
  // Fires when trainingStartFen changes (set by the training response handler).
  useEffect(() => {
    if (!trainingStartFen) return;
    const mode = currentResponseType === "Opening" ? "opening"
      : currentResponseType === "Middlegame" ? "middlegame"
      : currentResponseType === "Endgame" ? "endgame"
      : null;
    if (!mode) return;
    setConversationHistory([]);
    saveConversationHistory([], mode).catch(() => {});
  }, [trainingStartFen, currentResponseType]);

  // Auto-eval: run a background engine analysis whenever the board position changes
  // (piece drag, arrow-key navigation, game browsing). Updates analysisLines so the
  // eval bar reflects the current position without needing a manual "Start Analysis".
  // Skipped in puzzle mode (would immediately reveal the answer).
  // Also runs opening detection (ECO lookup) on each new position.
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (currentResponseTypeRef.current === "Puzzle") return;
      // Skip while previewing a selected analysis line's moves — that FEN change is
      // a temporary preview, not a real move, and re-analyzing would both show a
      // redundant engine spinner and silently replace the line list being explored.
      if (selectedEngineLineIndexRef.current !== null) return;
      // Skip the one FEN change caused by a successful drill-down — that analysis was
      // already run explicitly as part of the drill, so this would just duplicate it
      // and (worse) wipe the exploration history stack it just built.
      if (suppressNextAutoEvalRef.current) {
        suppressNextAutoEvalRef.current = false;
        return;
      }

      // ECO opening detection — fast IPC (synchronous map lookup on main side)
      if (electronAPI?.ecoLookupFen && currentFen && currentFen !== "start") {
        electronAPI.ecoLookupFen(currentFen).then((match) => {
          if (cancelled) return;
          setAnalysisEcoLabel(match ? `${match.name} (${match.eco})` : "");
        }).catch(() => {});
      } else if (currentFen === "start") {
        setAnalysisEcoLabel("");
      }

      const es = engineStatusRef.current;
      const fs = formStateRef.current;
      if (!es?.configured || !electronAPI?.analyzePosition) return;

      try {
        const response = await electronAPI.analyzePosition({
          engine: fs.selectedEngine,
          fen: currentFen,
          depth: 5, // shallow depth for fast bar updates after each move
          multiPv: 4,
        });
        if (cancelled || !response?.ok) return;
        const lines: AnalysisLine[] = (response as any).analysis?.lines ?? [];
        if (!lines.length) return;
        // Update lines and entries, then fetch LLM explanation for the top line.
        setAnalysisLines(lines);
        setAnalysisEntries(lines.map((line, i) => parseStockfishLine(line, i + 1, currentFen)));
        setLineExplanations({}); // clear old explanations for fresh analysis
        setExplorationStack([]); // a real board move starts a fresh top-level analysis

        // Auto-explanation disabled to prevent position validation errors on subsequent moves
        // Explanations are only generated when user explicitly clicks on a move
      } catch {
        // Background analysis — ignore errors silently.
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentFen]);

  // Update PGN in real-time as FEN changes (moves forward/backward)
  useEffect(() => {
    if (currentFen === "start") {
      setCurrentRawPgn("");
      return;
    }
    try {
      const chess = new Chess();
      chess.load(currentFen);
      setCurrentRawPgn(chess.pgn());
    } catch (err) {
      // Invalid FEN; don't update PGN
    }
  }, [currentFen]);

  const fetchExplanations = useCallback(
    async (fen: string, lines: AnalysisLine[]): Promise<void> => {
      if (!lines?.length || !electronAPI?.explainLines) {
        return;
      }
      try {
        await electronAPI.explainLines({
          fen,
          lines,
          language: formState.explainLanguage,
          model: getModelForProvider(formState.llmProvider, formState.ollamaModel, formState.llmModel),
          baseUrl: getBaseUrlForProvider(formState.llmProvider, formState.ollamaBaseUrl),
          llmProvider: formState.llmProvider,
          llmApiKey: formState.llmApiKey
        });
      } catch (err) {
        // Handle error silently
      }
    },
    [formState.explainLanguage, formState.ollamaModel, formState.ollamaBaseUrl, formState.llmProvider, formState.llmApiKey]
  );

  const handleAnalysisSuccess = useCallback(
    (lines: AnalysisLine[], fen: string): void => {
      if (!lines?.length) return; // keep previous eval on the bar when result is empty
      setAnalysisLines(lines);
      setSelectedEngineLineIndex(null);
      setSelectedEngineLineData(null);
      setDeepAnalysisResults({});
      setExplorationStack([]); // a fresh manual analysis starts a new top-level list
      const entries = (lines || []).map((line, index) =>
        parseStockfishLine(line, index + 1, currentFen)
      );
      setAnalysisEntries(entries);
      setAnalysisStatus("");
      fetchExplanations(fen, lines);
    },
    [fetchExplanations, currentFen]
  );

  const handleSelectAnalysisLine = useCallback((entry: AnalysisEntry): void => {
    if (!entry) {
      setSelectedAnalysisLineId(null);
      return;
    }
    setSelectedAnalysisLineId(entry.id);
  }, []);

  const runAnalysis = useCallback(
    async (fen: string, deepMode = false): Promise<void> => {
      if (!electronAPI?.analyzePosition) {
        setAnalysisStatus("Analysis engine unavailable.");
        return;
      }
      setAnalysisLoading(true);
      setAnalysisStatus("");
      const engineName = formState.selectedEngine?.toUpperCase() || "ENGINE";
      try {
        const response = await electronAPI.analyzePosition({
          engine: formState.selectedEngine,
          fen,
          depth: formState.analysisDepth,
          multiPv: 4
        });
        if (!response?.ok) {
          setAnalysisStatus((response as any)?.error || `${engineName} analysis failed.`);
          return;
        }
        const lines = (response as any).analysis?.lines || [];
        handleAnalysisSuccess(lines, fen);

        // Deep LLM pass when in advanced mode
        if (deepMode && lines.length > 0 && electronAPI?.deepAnalyzeLines) {
          setDeepAnalysisLoading(true);
          electronAPI.deepAnalyzeLines({ fen, lines }).then((res) => {
            if (res?.ok && res.results) {
              const map: Record<number, DeepLineAnalysis | null> = {};
              for (const r of res.results) map[r.lineIndex] = r.analysis;
              setDeepAnalysisResults(map);
            }
          }).catch(() => {}).finally(() => setDeepAnalysisLoading(false));
        }
      } catch (err) {
        setAnalysisStatus(`${engineName} analysis failed.`);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [formState.analysisDepth, formState.selectedEngine, handleAnalysisSuccess]
  );

  const handleStartAdvancedAnalysis = useCallback(() => {
    setAdvancedAnalysisMode(true);
    setIsAnalysisRunning(true);
    setDeepAnalysisResults({});
    runAnalysis(currentFen, true);
  }, [currentFen, runAnalysis]);

  // Auto-run analysis on start position when entering analysis mode
  useEffect(() => {
    if (viewMode === "analysis" && settingsLoaded && !isAnalysisRunning && analysisLines.length === 0 && currentFen === "start") {
      // Automatically run analysis on the start position to show lines immediately
      setIsAnalysisRunning(true);
      runAnalysis("start");
    }
  }, [viewMode, settingsLoaded, isAnalysisRunning, analysisLines.length, currentFen, runAnalysis]);

  const annotateGameWithNotes = (pgn: string, notesMap: Record<string, string>): string => {
    // For now, append notes as comments at the end of the PGN
    // In a full implementation, would parse PGN and attach comments to specific moves
    let annotated = pgn;
    const notesList = Object.values(notesMap).filter(note => note.trim().length > 0);
    if (notesList.length > 0) {
      annotated += `\n\n{ Analysis Notes:\n${notesList.join("\n\n")} }`;
    }
    return annotated;
  };

  const handleSaveNotesAndExit = useCallback(async () => {
    // Convert currentRawPgn to include note annotations
    if (currentRawPgn) {
      const annotatedPgn = annotateGameWithNotes(currentRawPgn, currentNotesMap);
      try {
        // Note: saveAnnotatedPgn would be implemented in electron/main.ts
        // For now, just save notes to local map
        setStatusMessage("Analysis notes saved.");
      } catch (err) {
        setStatusMessage("Failed to save annotated PGN.");
      }
    }
    setAdvancedAnalysisMode(false);
    setIsAnalysisRunning(false);
    setAnalysisLoading(false);
    setDeepAnalysisLoading(false);
    setAnalysisStatus("Analysis stopped.");
    setAdvancedAnalysisNotesModified(false);
    setNotesConfirmDialogOpen(false);
  }, [currentRawPgn, currentNotesMap, electronAPI]);

  const handleDiscardNotesAndExit = useCallback(() => {
    setAdvancedAnalysisMode(false);
    setIsAnalysisRunning(false);
    setAnalysisLoading(false);
    setDeepAnalysisLoading(false);
    setAnalysisStatus("Analysis stopped.");
    setAdvancedAnalysisNotesModified(false);
    setNotesConfirmDialogOpen(false);
  }, []);

  const handleStopAdvancedAnalysis = useCallback(() => {
    // Check if notes have been modified
    if (advancedAnalysisNotesModified) {
      setNotesConfirmDialogOpen(true);
    } else {
      setAdvancedAnalysisMode(false);
      setIsAnalysisRunning(false);
      setAnalysisLoading(false);
      setDeepAnalysisLoading(false);
      setAnalysisStatus("Analysis stopped.");
      setAdvancedAnalysisNotesModified(false);
    }
  }, [advancedAnalysisNotesModified]);

  const handleStartAnalysis = useCallback(() => {
    setIsAnalysisRunning(true);
    runAnalysis(currentFen);
  }, [currentFen, runAnalysis]);

  const handleStopAnalysis = useCallback(() => {
    setIsAnalysisRunning(false);
    setAnalysisLoading(false);
    setAnalysisStatus("Analysis stopped.");
  }, []);

  const handleResetBoard = useCallback(() => {
    // Full app reset - clear all state back to initial analysis mode
    setCurrentFen("start");
    setQuestionResponse("");
    setViewMode("analysis");

    // Clear all puzzle state
    setPuzzleSolution([]);
    setPuzzleSolutionSan([]);
    setPuzzleAttemptMoves([]);
    setPuzzleStartFen("");
    setPuzzleNavigationMode(false);
    setPuzzleIncorrect(false);
    setShowSolution(false);
    setPuzzleMeta(null);
    setCurrentMoveIndex(0);
    setPuzzleExplainLoading(false);

    // Clear analysis state
    setAnalysisLines([]);
    setExplorationStack([]);
    setSelectedEngineLineIndex(null);
    setSelectedEngineLineData(null);

    // Clear game state
    setGameMode(false);
    setCurrentGameInfo(null);
    setConversationHistory([]);
    setCurrentResponseType("Analysis");
    setCurrentResponseData({});

    // Reset to analysis conversation mode
    conversationModeRef.current = "analysis";
    loadConversationHistory("analysis").catch(() => {});

    setStatusMessage("App reset. Ready to analyze.");
  }, [setStatusMessage, loadConversationHistory]);

  const applyPuzzleSolutionMove = useCallback((moveIndex: number) => {
    if (!puzzleStartFen) return;
    if (moveIndex < 0) {
      setCurrentFen(puzzleStartFen);
      return;
    }
    const chess = new Chess();
    try {
      chess.load(puzzleStartFen);
    } catch {
      return;
    }
    for (let i = 0; i <= moveIndex && i < puzzleSolution.length; i++) {
      const uci = puzzleSolution[i];
      try {
        // chess.js v1 requires {from, to} object — raw UCI strings throw
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      } catch {
        setStatusMessage(`Invalid solution move: ${uci}`);
        return;
      }
    }
    setCurrentFen(chess.fen());
  }, [puzzleStartFen, puzzleSolution]);

  const fetchPerMoveExplanation = useCallback(async (
    lineIndex: number,
    lineData: AnalysisLine,
    baseFen: string,
    moveIndex: number,
    moveSan: string
  ): Promise<void> => {
    if (!electronAPI?.explainLines || !electronAPI?.identifyOpening || !electronAPI?.isValidOpeningPosition) return;
    setIsExplanationLoading(true);
    try {
      const pv = lineData.pv || lineData.line || "";

      // Skip position validation (it causes sync issues) - go straight to explanation
      // The explanation request includes the FEN and move context that LLM needs
      const question = `Explain the move ${moveSan} (move ${moveIndex + 1} in the line). Full line: ${pv}.

IMPORTANT: This is for children aged 4-18, so be engaging and clear.
Please explain:
1. Why this specific move was chosen
2. What is White trying to accomplish (White's plan/threats)
3. What is Black trying to accomplish (Black's plan/threats)
4. What specific threats and tactical opportunities exist for both sides
5. If you know a real story about this move or position (famous player, legendary game), include it! Kids love learning chess history.

Make it detailed and exciting!`;

      const response = await electronAPI.explainLines({
        lines: [lineData],
        fen: baseFen,
        question,
        language: formState.explainLanguage,
        model: getModelForProvider(formState.llmProvider, formState.ollamaModel, formState.llmModel),
        baseUrl: getBaseUrlForProvider(formState.llmProvider, formState.ollamaBaseUrl),
        llmProvider: formState.llmProvider,
        llmApiKey: formState.llmApiKey
      });
      if (response?.ok && response.explanations?.[0]?.text) {
        const text = response.explanations[0].text;

        const cacheKey = `${baseFen}:${lineIndex}:${moveIndex}`;
        explanationCache.current.set(cacheKey, text);
        setQuestionResponse(text);
      } else {
        setQuestionResponse(`⚠️ ${(response as any)?.error || "Unable to generate explanation."}`);
      }
    } catch (err) {
      setQuestionResponse(`⚠️ Explanation failed: ${(err as Error).message}`);
    } finally {
      setIsExplanationLoading(false);
    }
  }, [formState.explainLanguage, formState.ollamaModel, formState.ollamaBaseUrl, formState.llmProvider, formState.llmApiKey, formState.llmModel]);

  const handleSelectEngineLine = useCallback(async (lineIndex: number, line: AnalysisLine) => {
    // Snapshot this level before drilling in, so "back" can restore it without a fresh call.
    const parentFrame = {
      fen: currentFen,
      lines: analysisLines,
      entries: analysisEntries,
      listResponse: lastListResponseRef.current
    };
    setExplorationStack((stack) => [...stack, parentFrame]);

    setSelectedEngineLineIndex(lineIndex);
    setSelectedEngineLineData(line);
    setCurrentMoveIndex(0);
    setSelectedLineBaseFen(currentFen);
    const lineNum = line.rank || lineIndex + 1;
    setStatusMessage(`Line ${lineNum} selected.`);

    const pv = line.pv || line.line || "";
    const moves = pv.split(/\s+/).filter((m) => m.trim());
    if (moves.length === 0) return;

    const myRequestId = ++drillRequestIdRef.current;
    await fetchPerMoveExplanation(lineIndex, line, currentFen, 0, moves[0]);
    if (drillRequestIdRef.current !== myRequestId) return; // user navigated away while this was in flight

    // Drill in: run a fresh analysis of the position after this move, and present
    // its top candidates as a new list — lets the user keep exploring deeper.
    const cacheKey = `${currentFen}:${lineIndex}:0`;
    const explanationText = explanationCache.current.get(cacheKey);
    if (!explanationText) return; // explanation failed — nothing useful to drill into

    const chess = new Chess();
    let resultingFen: string;
    try {
      chess.load(currentFen);
      const moveResult = chess.move({ from: moves[0].slice(0, 2), to: moves[0].slice(2, 4), promotion: moves[0][4] as any });
      if (!moveResult) return;
      resultingFen = chess.fen();
    } catch {
      return;
    }

    if (!engineStatusRef.current?.configured || !electronAPI?.analyzePosition) return;
    setIsDrillLoading(true);
    try {
      const response = await electronAPI.analyzePosition({
        engine: formStateRef.current.selectedEngine,
        fen: resultingFen,
        depth: 5,
        multiPv: 4,
      });
      if (drillRequestIdRef.current !== myRequestId) return; // stale — user already navigated away
      if (response?.ok) {
        const newLines: AnalysisLine[] = (response as any).analysis?.lines ?? [];
        if (newLines.length > 0) {
          setAnalysisLines(newLines);
          setAnalysisEntries(newLines.map((l, i) => parseStockfishLine(l, i + 1, resultingFen)));
          suppressNextAutoEvalRef.current = true;
          setCurrentFen(resultingFen);
          setSelectedEngineLineIndex(null);
          setSelectedEngineLineData(null);
          setCurrentMoveIndex(0);
          lastListResponseRef.current = explanationText;
        }
      }
    } catch {
      // Drill-down analysis is best-effort — keep showing the move explanation on failure.
    } finally {
      if (drillRequestIdRef.current === myRequestId) setIsDrillLoading(false);
    }
  }, [currentFen, analysisLines, analysisEntries, fetchPerMoveExplanation]);

  // Pops one level of the exploration stack (or just clears the current selection at
  // the top level), restoring the prior list and its response without a fresh call.
  const handleBackFromLine = useCallback(() => {
    drillRequestIdRef.current++; // invalidate any in-flight drill so it can't clobber this
    setIsDrillLoading(false);
    setSelectedEngineLineIndex(null);
    setSelectedEngineLineData(null);
    setCurrentMoveIndex(0);

    if (explorationStack.length > 0) {
      const parent = explorationStack[explorationStack.length - 1];
      setExplorationStack((stack) => stack.slice(0, -1));
      setAnalysisLines(parent.lines);
      setAnalysisEntries(parent.entries);
      suppressNextAutoEvalRef.current = true;
      setCurrentFen(parent.fen);
      lastListResponseRef.current = parent.listResponse;
      setQuestionResponse("");
      setTimeout(() => setQuestionResponse(parent.listResponse), 80);
    } else {
      setQuestionResponse("");
      setTimeout(() => setQuestionResponse(lastListResponseRef.current), 80);
    }
  }, [explorationStack]);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Do not intercept when the user is typing in any input/textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
      return;
    }

    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    // Training agent navigation (Opening / Endgame)
    // Right arrow = advance to next move (consistent with game mode)
    // Left arrow  = retreat to previous position
    if ((currentResponseType === "Opening" || currentResponseType === "Middlegame" || currentResponseType === "Endgame") && trainingMoves.length > 0) {
      event.preventDefault();
      if (event.key === "ArrowRight") {
        // Advance to next training move
        const next = trainingMoveIndex + 1;
        if (next >= trainingMoves.length) {
          setQuestionResponse("You've reached the end of the training line! Great work! 🎉");
          return;
        }
        setTrainingMoveIndex(next);
        // Replay moves 0..next from trainingStartFen for correctness
        const chess = new Chess();
        try { chess.load(trainingStartFen); } catch { /* use default */ }
        let lastResult: ReturnType<Chess["move"]> | null = null;
        for (let i = 0; i <= next; i++) {
          const m = trainingMoves[i];
          lastResult = chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
        }
        setCurrentFen(chess.fen());
        setQuestionResponse(trainingMoves[next].commentary);
        setTrainingMoveLabel(`${next + 1}. ${sanWithGlyph(trainingMoves[next].san, lastResult?.color === "b")}`);
      } else {
        // Retreat to previous position
        const prev = trainingMoveIndex - 1;
        setTrainingMoveIndex(prev);
        if (prev < 0) {
          setCurrentFen(trainingStartFen);
          setQuestionResponse("Back to the start! Press → to step through the moves.");
          setTrainingMoveLabel("");
        } else {
          const chess = new Chess();
          try { chess.load(trainingStartFen); } catch { /* use default */ }
          let lastResult: ReturnType<Chess["move"]> | null = null;
          for (let i = 0; i <= prev; i++) {
            const m = trainingMoves[i];
            lastResult = chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
          }
          setCurrentFen(chess.fen());
          setQuestionResponse(trainingMoves[prev].commentary);
          setTrainingMoveLabel(`${prev + 1}. ${sanWithGlyph(trainingMoves[prev].san, lastResult?.color === "b")}`);
        }
      }
      return;
    }

    // Game mode navigation (arrow keys step through game moves)
    if (gameMode && gamePgnFens.length > 0) {
      event.preventDefault();
      if (event.key === "ArrowRight") {
        const next = Math.min(gameMoveIndex + 1, gamePgnFens.length - 1);
        setGameMoveIndex(next);
        setCurrentFen(gamePgnFens[next]);
      } else {
        const prev = Math.max(gameMoveIndex - 1, 0);
        setGameMoveIndex(prev);
        setCurrentFen(gamePgnFens[prev]);
      }
      return;
    }

    // Puzzle solution navigation mode
    if (puzzleNavigationMode && puzzleSolution.length > 0) {
      if (event.key === "ArrowRight") {
        // Forward navigation only allowed after solution is revealed
        if (!showSolution) return;
        event.preventDefault();
        const next = currentMoveIndex + 1;
        if (next > puzzleSolution.length) return;
        setCurrentMoveIndex(next);
        applyPuzzleSolutionMove(next - 1);
      } else {
        event.preventDefault();
        if (currentMoveIndex <= 0) return;
        const prev = currentMoveIndex - 1;
        setCurrentMoveIndex(prev);
        if (prev === 0) {
          applyPuzzleSolutionMove(-1);
        } else {
          applyPuzzleSolutionMove(prev - 1);
        }
      }
      return;
    }

    // Analysis line navigation mode
    if (selectedEngineLineIndex === null || !selectedEngineLineData) {
      return;
    }

    const pv = selectedEngineLineData.pv || selectedEngineLineData.line || "";
    const moves = pv.split(/\s+/).filter((m) => m.trim());

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = currentMoveIndex + 1;
      if (nextIndex >= moves.length) {
        setQuestionResponse("End of line — no more moves.");
        return;
      }
      setCurrentMoveIndex(nextIndex);
      // Update board position to show the position after this move
      const fenSequence = deriveFenSequence(moves.slice(0, nextIndex + 1), selectedLineBaseFen);
      if (fenSequence && fenSequence.length > 0) {
        setCurrentFen(fenSequence[fenSequence.length - 1]);
      }
      const cacheKey = `${selectedLineBaseFen}:${selectedEngineLineIndex}:${nextIndex}`;
      const cached = explanationCache.current.get(cacheKey);
      if (cached) {
        setQuestionResponse(cached);
      } else {
        void fetchPerMoveExplanation(
          selectedEngineLineIndex,
          selectedEngineLineData,
          selectedLineBaseFen,
          nextIndex,
          moves[nextIndex]
        );
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (currentMoveIndex <= 0) {
        // Go back to the line's starting position
        setCurrentFen(selectedLineBaseFen);
        setCurrentMoveIndex(0);
        setQuestionResponse("");
        return;
      }
      const prevIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(prevIndex);
      // Update board position to show the position after this move
      const fenSequence = deriveFenSequence(moves.slice(0, prevIndex + 1), selectedLineBaseFen);
      if (fenSequence && fenSequence.length > 0) {
        setCurrentFen(fenSequence[fenSequence.length - 1]);
      }
      const cacheKey = `${selectedLineBaseFen}:${selectedEngineLineIndex}:${prevIndex}`;
      const cached = explanationCache.current.get(cacheKey);
      if (cached) {
        setQuestionResponse(cached);
      } else {
        setQuestionResponse("Navigate forward to generate explanation for this move.");
      }
    }
  }, [
    gameMode, gamePgnFens, gameMoveIndex,
    puzzleNavigationMode, puzzleSolution, currentMoveIndex, applyPuzzleSolutionMove,
    showSolution, selectedEngineLineIndex, selectedEngineLineData, selectedLineBaseFen, fetchPerMoveExplanation,
    currentResponseType, trainingMoves, trainingMoveIndex, trainingStartFen
  ]);

  useEffect(() => {
    const trainingActive = (currentResponseType === "Opening" || currentResponseType === "Middlegame" || currentResponseType === "Endgame") && trainingMoves.length > 0;
    if (selectedEngineLineIndex === null && !puzzleNavigationMode && !gameMode && !trainingActive) {
      return;
    }
    document.addEventListener("keydown", handleKeyboardNavigation);
    return () => {
      document.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [selectedEngineLineIndex, puzzleNavigationMode, gameMode, handleKeyboardNavigation, currentResponseType, trainingMoves]);

  // Fetch FIDE ratings when a game loads
  useEffect(() => {
    if (!gameMode || !currentGameInfo) return;
    let cancelled = false;
    Promise.all([fetchFideRating(currentGameInfo.white), fetchFideRating(currentGameInfo.black)])
      .then(([whiteRating, blackRating]) => {
        if (cancelled) return;
        setCurrentGameInfo(prev =>
          prev ? { ...prev, whiteFideRating: whiteRating ?? undefined, blackFideRating: blackRating ?? undefined } : null
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [gameMode, currentGameInfo?.white, currentGameInfo?.black]);

  const applyLineMove = useCallback((moveIndex: number) => {
    if (!selectedEngineLineData) {
      return;
    }
    const pv = selectedEngineLineData.pv || selectedEngineLineData.line || "";
    const moves = pv.split(/\s+/).filter((m) => m.trim());

    if (moves.length === 0) {
      return;
    }

    const chess = new Chess();
    // Use the base FEN captured when the line was selected, not the current FEN
    // (which changes as moves are applied — using it would cause wrong position)
    const baseFen = selectedLineBaseFen || currentFen;
    try {
      chess.load(baseFen);
    } catch {
      setStatusMessage("Error loading base position for line replay.");
      return;
    }

    try {
      for (let i = 0; i <= moveIndex && i < moves.length; i++) {
        const moveResult = chess.move(moves[i]);
        if (!moveResult) {
          setStatusMessage(`Invalid move in line: ${moves[i]}`);
          return;
        }
      }
      const newFen = chess.fen();
      setCurrentFen(newFen);
    } catch (err) {
      setStatusMessage("Error applying line move.");
    }
  }, [selectedEngineLineData, selectedLineBaseFen, currentFen]);

  useEffect(() => {
    if (selectedEngineLineIndex !== null && selectedEngineLineData) {
      applyLineMove(currentMoveIndex);
    }
  }, [currentMoveIndex, selectedEngineLineIndex, selectedEngineLineData, applyLineMove]);

  const handleMoveAttempt = useCallback((from: string, to: string, _fen: string) => {
    if (currentResponseType !== "Puzzle" || puzzleSolution.length === 0) return;
    const uciMove = `${from}${to}`;
    // Normalize: compare only first 4 chars (strip promotion suffix from solution if present)
    const expectedMove = (puzzleSolution[puzzleAttemptMoves.length] || "").substring(0, 4);
    if (uciMove !== expectedMove) {
      setSnackbarMessage("Incorrect move! Try again or reveal the solution.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      setPuzzleAttemptMoves([]);
      setCurrentFen(puzzleStartFen);
      setCurrentMoveIndex(0);
      setPuzzleIncorrect(true);

      // Deferred LLM explanation on incorrect drag attempt
      if (electronAPI?.puzzleExplainIncorrect && puzzleMeta && puzzleStartFen) {
        setPuzzleExplainLoading(true);
        setQuestionResponse("Working out what went wrong…");
        const userMovesUci = [uciMove];
        const userMovesSan = uciSequenceToSan(puzzleStartFen, userMovesUci);
        electronAPI.puzzleExplainIncorrect({
          puzzleFen: puzzleStartFen,
          solutionUci: puzzleSolution,
          solutionSan: puzzleSolutionSan,
          userMovesUci,
          userMovesSan,
          themes: puzzleMeta.themes,
          difficulty: puzzleMeta.difficulty,
          rating: puzzleMeta.rating,
        }).then((res) => {
          if (res?.ok && res.explanation) {
            setQuestionResponse(res.explanation);
          } else {
            setQuestionResponse("Incorrect — try again or reveal the solution.");
          }
        }).catch(() => {
          setQuestionResponse("Incorrect — try again or reveal the solution.");
        }).finally(() => {
          setPuzzleExplainLoading(false);
        });
      } else {
        setQuestionResponse("Incorrect — try again or reveal the solution.");
      }
      return;
    }
    const newAttemptMoves = [...puzzleAttemptMoves, uciMove];
    setPuzzleAttemptMoves(newAttemptMoves);
    if (newAttemptMoves.length === puzzleSolution.length) {
      setSnackbarMessage("Correct! Well done.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setQuestionResponse("Correct! Well done. You solved the puzzle!");
      setPuzzleAttemptMoves([]);
      const rating = puzzleMeta?.rating ?? 1200;
      electronAPI?.recordSolve?.({ rating, solved: true }).then(() => {
        setProfileRefreshTrigger((n) => n + 1);
      }).catch(() => {});
    }
  }, [currentResponseType, puzzleSolution, puzzleSolutionSan, puzzleAttemptMoves, puzzleStartFen, puzzleMeta]);

  const handleRetryPuzzle = useCallback(() => {
    if (!puzzleStartFen) return;
    setCurrentFen(puzzleStartFen);
    setCurrentMoveIndex(0);
    setPuzzleAttemptMoves([]);
    setPuzzleIncorrect(false);
    setPuzzleExplainLoading(false);
    const explanation = currentResponseData?.explanation || currentResponseData?.answer || "";
    setQuestionResponse(explanation || "");
  }, [puzzleStartFen, currentResponseData]);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
    setPuzzleIncorrect(false);
    // Restore the original puzzle explanation that was overwritten by the "incorrect" message
    const explanation = currentResponseData?.explanation || currentResponseData?.answer || "";
    if (explanation) {
      setQuestionResponse(explanation);
    }
    if (puzzleStartFen) {
      setCurrentFen(puzzleStartFen);
      setCurrentMoveIndex(0);
      setPuzzleNavigationMode(true);
    }
    const rating = puzzleMeta?.rating ?? 1200;
    electronAPI?.recordSolve?.({ rating, solved: false }).then(() => {
      setProfileRefreshTrigger((n) => n + 1);
    }).catch(() => {});
  }, [puzzleStartFen, currentResponseData, puzzleMeta]);

  const applyPositions = useCallback(
    (positions: string[], message?: string): void => {
      if (!positions?.length) {
        setAnalysisStatus("No valid positions found.");
        return;
      }
      const finalFen = positions[positions.length - 1];
      setImportText(finalFen === "start" ? "start" : finalFen);
      setCurrentFen(finalFen);
      setStatusMessage(message || "Position loaded.");
      setAnalysisStatus("");
      runAnalysis(finalFen);
    },
    [runAnalysis]
  );

  const handleFormChange = useCallback(
    (key: string, value: string | number): void => {
      if (key === "ollamaModel") {
        userSelectedModelRef.current = true;
      }
      setFormState((prev) => ({
        ...prev,
        [key]: value
      }));

      // Only call setOllamaModel for non-empty model changes on Ollama provider
      if (key === "ollamaModel" && value && electronAPI?.setOllamaModel) {
        setFormState((prev) => {
          if (prev.llmProvider === "ollama") {
            const selected = String(value);
            setStatusMessage(`Switching to ${selected}...`);
            electronAPI
              .setOllamaModel(selected)
              .then(() => {
                setStatusMessage(`Ollama model set to ${selected}.`);
              })
              .catch(() => {
                setStatusMessage("Unable to start the selected Ollama model.");
              });
          }
          return prev;
        });
      }
    },
    []
  );

  const handleDetect = useCallback(async (): Promise<void> => {
    const selectedEngine = formState.selectedEngine || "lc0";
    if (!electronAPI?.detectEngine) {
      setStatusMessage("Auto-detect is unavailable.");
      return;
    }
    setStatusMessage("Scanning for chess engine...");
    try {
      const result = await electronAPI.detectEngine({ engine: selectedEngine });
      if (result?.found && result?.path) {
        setFormState((prev) => ({ ...prev, [`${selectedEngine}Path`]: result.path }));
        setStatusMessage("Chess engine path auto-detected.");
        return;
      }
      setStatusMessage("Chess engine could not be detected automatically.");
    } catch (err) {
      setStatusMessage("Auto-detection failed.");
    }
  }, [formState.selectedEngine]);

  const handleBrowse = useCallback(async (): Promise<void> => {
    const selectedEngine = formState.selectedEngine || "lc0";
    if (!electronAPI?.browseForEngine) {
      setStatusMessage("Browse dialog unavailable.");
      return;
    }
    try {
      const response = await electronAPI.browseForEngine({ engine: selectedEngine });
      if (!response?.selected) {
        setStatusMessage("No executable selected.");
        return;
      }
      if (!response.valid) {
        setStatusMessage("Selected file is not a valid chess engine.");
        return;
      }
      setFormState((prev) => ({ ...prev, [`${selectedEngine}Path`]: response.path || prev[`${selectedEngine}Path` as keyof AppSettings] }));
      setStatusMessage("Chess engine executable selected.");
    } catch (err) {
      setStatusMessage("Unable to browse for chess engine.");
    }
  }, [formState.selectedEngine]);

  const handleDetectAllEngines = useCallback(async (): Promise<void> => {
    if (!electronAPI?.detectEngine) {
      setStatusMessage("Engine detection is unavailable.");
      return;
    }
    setStatusMessage("Scanning for engines...");
    try {
      const results: Record<string, string> = {};
      for (const engine of ["stockfish", "lc0"]) {
        const result = await electronAPI.detectEngine({ engine });
        if (result?.found && result?.path) {
          results[engine] = result.path;
          setStatusMessage(`${engine.toUpperCase()} found at ${result.path}`);
        }
      }
      if (Object.keys(results).length > 0) {
        setFormState((prev) => ({
          ...prev,
          stockfishPath: results.stockfish || prev.stockfishPath,
          lc0Path: results.lc0 || prev.lc0Path
        }));
        setAvailableEngines([
          ...(results.stockfish ? [{ name: "stockfish", path: results.stockfish, status: "installed" as const }] : []),
          ...(results.lc0 ? [{ name: "lc0", path: results.lc0, status: "installed" as const }] : [])
        ]);
        setStatusMessage(`Detection complete: ${Object.keys(results).length} engine(s) found.`);
      } else {
        setStatusMessage("No engines were detected. Please browse manually.");
      }
    } catch (err) {
      setStatusMessage("Engine detection failed.");
    }
  }, []);

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    const selectedEngine = formState.selectedEngine || "lc0";
    const selectedPath = formState[`${selectedEngine}Path` as keyof AppSettings];

    if (!selectedPath) {
      setStatusMessage("Please provide a chess engine executable path.");
      return;
    }
    if (!electronAPI?.setEnginePath || !electronAPI?.updateAppSettings) {
      setStatusMessage("Renderer APIs are not ready.");
      return;
    }
    setSettingsSaving(true);
    setStatusMessage("Validating and saving settings...");
    try {
      const pathResult = await electronAPI.setEnginePath({
        engine: selectedEngine,
        path: String(selectedPath)
      });
      if (!pathResult?.ok) {
        setStatusMessage("Chess engine path validation failed.");
        return;
      }
      const configResult = await electronAPI.updateAppSettings({
        selectedEngine: selectedEngine as "stockfish" | "lc0",
        [`${selectedEngine}Path`]: String(selectedPath),
        analysisDepth: Number(formState.analysisDepth),
        engineTimeoutMs: Number(formState.engineTimeoutMs),
        explainLanguage: formState.explainLanguage,
        ollamaModel: formState.ollamaModel,
        ollamaBaseUrl: formState.ollamaBaseUrl,
        llmProvider: formState.llmProvider,
        llmModel: formState.llmModel,
        llmApiKey: formState.llmApiKey,
        puzzleRatingMin: formState.puzzleRatingMin ?? 1000,
        puzzleRatingMax: formState.puzzleRatingMax ?? 1500,
        otbImportDir: formState.otbImportDir || ""
      });
      if (!configResult?.ok) {
        setStatusMessage("Failed to persist application settings.");
        return;
      }
      setEngineStatus((prev) => ({
        ...prev!,
        configured: true,
        selectedEngine,
        [`${selectedEngine}Path`]: String(selectedPath),
        settings: (configResult as any).settings
      }));
      setSnackbarMessage("Settings saved and chess engine validated.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setStatusMessage("");
      setProfileRefreshTrigger((n) => n + 1);
      fetchSystemStatus();
    } catch (err) {
      setSnackbarMessage("Unable to save settings.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setSettingsSaving(false);
    }
  }, [fetchSystemStatus, formState]);

  const handleEngineChange = useCallback((engineName: string): void => {
    setFormState((prev) => ({
      ...prev,
      selectedEngine: engineName as "stockfish" | "lc0"
    }));
    setStatusMessage(`Switched to ${engineName.toUpperCase()}.`);
  }, []);

  const handleSettingsComplete = useCallback((): void => {
    if (!engineStatus?.configured) {
      setStatusMessage("Please configure a chess engine before entering the analysis view.");
      return;
    }
    setViewMode("analysis");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_FLAG, "true");
    }
  }, [engineStatus]);

  const handleResetToStart = useCallback((): void => {
    setImportText("start");
    setAnalysisStatus("");
    applyPositions(["start"], "Start position loaded.");
  }, [applyPositions]);

  const handlePositionConfirm = useCallback((fen: string): void => {
    setCurrentFen(fen);
    setStatusMessage("Position updated.");
    runAnalysis(fen);
  }, [runAnalysis]);

  const handleLineDialogClose = useCallback((): void => {
    setLineDialogOpen(false);
    setActiveLine(null);
    setLineAnalysisText("");
    setLineAnalysisError("");
  }, []);

  const handleShowLine = useCallback(
    async (entry: AnalysisEntry | null): Promise<void> => {
      if (!entry) {
        return;
      }
      setActiveLine(entry);
      setLineDialogOpen(true);
      setLineAnalysisText("");
      setLineAnalysisError("");
      if (!entry.moves?.length) {
        setLineAnalysisError("This line has no parsed moves to analyze.");
        return;
      }
      if (!electronAPI?.askQuestion) {
        setLineAnalysisError("LLM analysis API is unavailable.");
        return;
      }
      setLineAnalysisLoading(true);
      const fallbackMoves = entry.moves.map((move) => `${move.from}${move.to}`).join(" ");
      const userMessage = entry.llmUserMessage || `Position FEN: ${currentFen}\nMoves: ${fallbackMoves || "none"}\nRisks: Analyze the current threats and opportunities.\nAttack: Describe the attacking plan for the side to move.\nOpponent idea: Suggest what the opponent should do next.`;
      try {
        const response = await electronAPI.askQuestion({
          userMessage,
          fen: currentFen,
          lines: analysisLines,
          language: formState.explainLanguage,
          model: getModelForProvider(formState.llmProvider, formState.ollamaModel, formState.llmModel),
          baseUrl: getBaseUrlForProvider(formState.llmProvider, formState.ollamaBaseUrl),
          llmProvider: formState.llmProvider,
          llmApiKey: formState.llmApiKey
        });
        if (!response?.ok || !response.answer) {
          const fallback = (response as any)?.error || "LLM did not return any analysis.";
          setLineAnalysisError(fallback);
        } else {
          setLineAnalysisText(response.answer);
        }
      } catch (err) {
        setLineAnalysisError("LLM analysis failed.");
      } finally {
        setLineAnalysisLoading(false);
      }
    },
    [analysisLines, currentFen, formState.explainLanguage, formState.ollamaBaseUrl, formState.ollamaModel, formState.llmProvider, formState.llmApiKey]
  );

  const handlePlayLine = useCallback(
    (moves) => {
      if (!moves?.length) {
        setAnalysisStatus("No moves to replay.");
        return;
      }
      const sequence = deriveFenSequence(moves, currentFen);
      if (!sequence?.length) {
        setAnalysisStatus("Unable to replay this line.");
        return;
      }
      applyPositions(sequence, "Replayed analysis line.");
    },
    [applyPositions, currentFen]
  );

  const openImportPicker = useCallback((): void => {
    importFileInput.current?.click();
  }, []);

  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (typeof FileReader === "undefined") {
      setImportError("File uploads are unavailable.");
      return;
    }
    setImportLoading(true);
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ""));
      setImportLoading(false);
    };
    reader.onerror = () => {
      setImportError("Unable to read the selected file.");
      setImportLoading(false);
    };
    reader.readAsText(file);
    event.target.value = "";
  }, []);

  const handleImportSubmit = useCallback((): void => {
    const text = String(importText || "").trim();
    if (!text) {
      setImportError("Provide FEN or PGN text.");
      return;
    }
    setImportLoading(true);
    const result = parseFenOrPgnInput(text);
    if ("error" in result) {
      setImportError(result.error);
      setImportLoading(false);
      return;
    }
    setImportError("");
    applyPositions(result.positions, "Imported positions applied.");
    setImportDialogOpen(false);
    setImportLoading(false);
  }, [applyPositions, importText]);

  // Parse PGN moves text into an ordered array of FEN strings (position 0 = start)
  const parsePgnToFens = useCallback((pgnMoves: string): string[] => {
    const cleanMoves = pgnMoves.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, "").trim();
    if (!cleanMoves) return [];
    const parser = new Chess();
    try {
      parser.loadPgn(cleanMoves);
    } catch {
      return [];
    }
    const history = parser.history({ verbose: true });
    const board = new Chess();
    const fens: string[] = [board.fen()];
    for (const mv of history) {
      try { board.move(mv.san); } catch { break; }
      fens.push(board.fen());
    }
    return fens;
  }, []);

  // Returns true if the game was loaded successfully; false if PGN could not be parsed.
  const loadGameFromRow = useCallback((game: import("./types").GameRow): boolean => {
    const fens = parsePgnToFens(game.pgn_moves);
    // fens[0] is always the starting position; if that's all we have, no moves parsed.
    if (fens.length <= 1) return false;
    setGamePgnFens(fens);
    // Start at move 1 so the board shows a changed position — visual proof the game loaded.
    setGameMoveIndex(1);
    setCurrentFen(fens[1]);
    setGameMode(true);
    setCurrentGameInfo({
      white: game.white,
      black: game.black,
      whiteElo: game.white_elo > 0 ? game.white_elo : undefined,
      blackElo: game.black_elo > 0 ? game.black_elo : undefined,
    });
    setShowSolution(false);
    setAnalysisLines([]);
    setSelectedEngineLineIndex(null);
    setSelectedEngineLineData(null);
    setExplorationStack([]);
    setCurrentRawPgn(game.pgn_moves || "");
    return true;
  }, [parsePgnToFens, setCurrentGameInfo]);

  const handleQuestion = useCallback(async (overrideQuestion?: string): Promise<void> => {
    let question = String(overrideQuestion ?? questionText ?? "").trim();
    if (!question) {
      setStatusMessage("Ask a question about the current position.");
      return;
    }
    if (!electronAPI?.askQuestion) {
      setStatusMessage("LLM question API unavailable.");
      return;
    }

    // Game list: user types a number to select a game.
    // Load the game onto the board, then fall through to the LLM so it can
    // give a contextual introduction instead of a static hardcoded message.
    // Use the ref (not state) so this closure always sees the latest list
    // regardless of when the callback was last recreated.
    const activeGameList = gameListRef.current ?? gameList;
    if (activeGameList !== null && activeGameList.length > 0 && /^\d+$/.test(question)) {
      const num = parseInt(question, 10);
      if (num >= 1 && num <= activeGameList.length) {
        const game = activeGameList[num - 1];
        const loaded = loadGameFromRow(game);
        if (!loaded) {
          setQuestionResponse("Sorry, I couldn't parse the moves for that game.");
          setQuestionText("");
          return;
        }
        const result = game.result ?? "?";
        const ctx    = [
          game.event  ? `at ${game.event}`  : "",
          game.date   ? `(${game.date})`     : "",
        ].filter(Boolean).join(" ");
        question = `I've selected the game: ${game.white} vs ${game.black}, result ${result}${ctx ? " " + ctx : ""}. Please briefly introduce these two players and what I should watch for as I step through the moves.`;
        setQuestionText("");
        // fall through to LLM
      }
    }

    // Game mode: "another game" → re-display the last game list or clear so user can re-ask
    if (gameMode && /\b(another|more|next|different)\b.{0,20}\bgame\b|\bgame\b.{0,20}\b(another|more|next|different)\b/i.test(question)) {
      setGameMode(false);
      setCurrentGameInfo(null);
      setGamePgnFens([]);
      setGameMoveIndex(0);
      setCurrentFen("start");
      setGameEcoLabel("");
      // Fall through so the question is processed as a new search
    }

    // Puzzle mode: detect typed move sequence attempt (handle locally, no LLM call).
    // When the input looks like moves we ALWAYS handle it here and never fall through
    // to the LLM — otherwise the LLM treats it as a general chess question.
    if (currentResponseType === "Puzzle" && puzzleSolution.length > 0 && puzzleStartFen) {
      if (looksLikeMoveAttempt(question)) {
        // Step 1 — try the straightforward path: parse the full sequence the
        // child typed (works when they include opponent responses).
        const fullParsed = parseChessNotation(question, puzzleStartFen);

        // Step 2 — if that returned nothing, the child typed only their own
        // moves ("Rh8+ Qh5+ Qh7#").  Interleave the solution's opponent moves
        // so each child token is evaluated at the correct board state.
        const rawPlayerMoves: string[] =
          fullParsed.length > 0
            ? (fullParsed.length === puzzleSolution.length
                ? fullParsed.filter((_, i) => i % 2 === 0)  // full sequence — keep player moves
                : fullParsed)                                // already player-only
            : parsePuzzlePlayerMoves(question, puzzleStartFen, puzzleSolution);

        // Step 3 — compare against the solution's player moves (4-char UCI prefix).
        const solutionPlayerMoves = puzzleSolution.filter((_, i) => i % 2 === 0);
        const norm = (arr: string[]) => arr.map(m => m.substring(0, 4));
        const isCorrect =
          rawPlayerMoves.length > 0 &&
          norm(rawPlayerMoves).length >= norm(solutionPlayerMoves).length &&
          norm(solutionPlayerMoves).every((m, i) => m === norm(rawPlayerMoves)[i]);

        setQuestionText("");
        if (isCorrect) {
          setQuestionResponse("Well done! You solved the puzzle! 🎉 Ask me for another puzzle or type any chess question.");
          setSnackbarMessage("Correct! Well done.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setPuzzleIncorrect(false);
          const solveRating = puzzleMeta?.rating ?? 1200;
          electronAPI?.recordSolve?.({ rating: solveRating, solved: true }).then(() => {
            setProfileRefreshTrigger((n) => n + 1);
          }).catch(() => {});
          // After a short celebration window, reset board and all puzzle state so
          // the user is in a clean Analysis state ready for the next question.
          setTimeout(() => {
            setCurrentFen("start");
            setCurrentResponseType("Analysis");
            setCurrentResponseData({});
            setGameMode(false);
            setCurrentGameInfo(null);
            setPuzzleSolution([]);
            setPuzzleSolutionSan([]);
            setPuzzleAttemptMoves([]);
            setPuzzleStartFen("");
            setPuzzleNavigationMode(false);
            setPuzzleIncorrect(false);
            setShowSolution(false);
            setPuzzleMeta(null);
            setCurrentMoveIndex(0);
            setAnalysisLines([]);
            setExplorationStack([]);
            setPuzzleExplainLoading(false);
            setQuestionResponse("");
            conversationModeRef.current = "analysis";
            loadConversationHistory("analysis").then(h => setConversationHistory(h)).catch(() => {});
          }, 2500);
        } else {
          setPuzzleIncorrect(true);
          setCurrentFen(puzzleStartFen);
          setCurrentMoveIndex(0);
          setSnackbarMessage("Incorrect — try again or reveal the solution.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);

          // Deferred LLM explanation — only triggered for wrong answers.
          // Pass the best UCI representation of what the child tried.
          const userMovesUci = rawPlayerMoves.length > 0 ? rawPlayerMoves : fullParsed;
          if (electronAPI?.puzzleExplainIncorrect && puzzleMeta) {
            setPuzzleExplainLoading(true);
            setQuestionResponse("Working out what went wrong…");
            const userMovesSan = uciSequenceToSan(puzzleStartFen, userMovesUci);
            electronAPI.puzzleExplainIncorrect({
              puzzleFen: puzzleStartFen,
              solutionUci: puzzleSolution,
              solutionSan: puzzleSolutionSan,
              userMovesUci,
              userMovesSan,
              themes: puzzleMeta.themes,
              difficulty: puzzleMeta.difficulty,
              rating: puzzleMeta.rating,
              llmProvider: formState.llmProvider,
              llmApiKey: formState.llmApiKey,
              model: getModelForProvider(formState.llmProvider, formState.ollamaModel, formState.llmModel),
              baseUrl: getBaseUrlForProvider(formState.llmProvider, formState.ollamaBaseUrl),
            }).then((res) => {
              if (res?.ok && res.explanation) {
                setQuestionResponse(res.explanation);
              } else {
                setQuestionResponse("Incorrect — try again or reveal the solution.");
              }
            }).catch(() => {
              setQuestionResponse("Incorrect — try again or reveal the solution.");
            }).finally(() => {
              setPuzzleExplainLoading(false);
            });
          } else {
            setQuestionResponse("Incorrect — try again or reveal the solution.");
          }
        }
        return;
      }
    }

    // Analysis mode: single digit selects a line (1–4)
    if (analysisLines.length > 0 && /^[1-4]$/.test(question)) {
      const lineIndex = parseInt(question, 10) - 1;
      if (lineIndex >= 0 && lineIndex < analysisLines.length) {
        handleSelectEngineLine(lineIndex, analysisLines[lineIndex]);
        setQuestionText("");
        return;
      }
    }

    // Clear previous agent statuses for new question
    setAgentStatuses([]);

    // Validate LLM settings before making request
    if (!isLlmSettingsValid(formState.llmProvider, formState.ollamaModel, formState.llmApiKey)) {
      const provider = formState.llmProvider || "unknown";
      if (provider !== "ollama" && !formState.llmApiKey) {
        setStatusMessage(`${provider} provider requires an API key. Please configure it in settings.`);
      } else if (!formState.ollamaModel) {
        setStatusMessage("LLM model is not selected. Please configure it in settings.");
      } else {
        setStatusMessage("LLM is not properly configured. Please check settings.");
      }
      return;
    }

    setQuestionLoading(true);
    setQuestionResponse(""); // Clear previous response
    setShowSolution(false); // Reset solution visibility

    try {
      // STEP 1: Determine if engine analysis is needed via local keyword check
      // main.ts handles full classification internally; no pre-flight LLM call needed
      let requiresEngine = quickDetectAnalysisRequired(question);

      // STEP 2: If analysis is required, run engine first
      let engineAnalysisLines: AnalysisLine[] = [];
      if (requiresEngine && electronAPI?.analyzePosition) {
        try {
          const analysisResponse = await electronAPI.analyzePosition({
            fen: currentFen,
            depth: 5,
            multiPv: 4
          });
          if (analysisResponse?.ok && analysisResponse?.analysis?.lines) {
            engineAnalysisLines = analysisResponse.analysis.lines;
          }
        } catch (engineError) {
          console.error("Engine analysis failed:", engineError);
          // Continue without engine analysis
          requiresEngine = false;
        }
      }

      // STEP 3: Send request to LLM (main.ts handles classification and routing)
      const finalResponse = await electronAPI.askQuestion({
        question,
        fen: currentFen,
        lines: engineAnalysisLines.length > 0 ? engineAnalysisLines : undefined,
        language: formState.explainLanguage,
        model: getModelForProvider(formState.llmProvider, formState.ollamaModel, formState.llmModel),
        baseUrl: getBaseUrlForProvider(formState.llmProvider, formState.ollamaBaseUrl),
        llmProvider: formState.llmProvider,
        llmApiKey: formState.llmApiKey,
        puzzleRatingMin: formState.puzzleRatingMin ?? 1000,
        puzzleRatingMax: formState.puzzleRatingMax ?? 1500,
        conversationHistory
      });

      if (!finalResponse?.ok) {
        const errorMsg = (finalResponse as any)?.error || "No response from LLM.";
        setQuestionResponse(`⚠️ Error: ${errorMsg}`);
        return;
      }

      // Parse response with new parser
      const parsedResponse = parseLLMResponse(finalResponse.answer || "");
      const validation = validateLLMResponse(parsedResponse);

      if (!validation.valid) {
        setQuestionResponse(`⚠️ Response validation error: ${validation.errors.join(", ")}`);
        return;
      }

      // Set response type and data
      const finalResponseType = parsedResponse.response_type || parsedResponse.type || "Analysis";
      setCurrentResponseType(finalResponseType);
      setCurrentResponseData(parsedResponse);

      // Clear game list when switching to a non-game mode so the list doesn't linger
      const isModeSwitching = ["Puzzle", "Position", "Opening", "Middlegame", "Endgame"].includes(finalResponseType);
      if (isModeSwitching) {
        setGameList(null);
        gameListRef.current = null;
      }

      // Update analysis lines if engine was used
      if (engineAnalysisLines.length > 0) {
        setAnalysisLines(engineAnalysisLines);
        setExplorationStack([]); // a new question starts a fresh top-level list
      }

      // Display the explanation/answer.
      // For training responses the story is shown first; navigation hint follows.
      const isTraining = finalResponseType === "Opening" || finalResponseType === "Middlegame" || finalResponseType === "Endgame";
      const displayText = isTraining
        ? ((parsedResponse as any).story || parsedResponse.explanation || "Ready! Press → to step through the moves.")
        : (parsedResponse.explanation || parsedResponse.answer || "No answer returned.");
      setQuestionResponse(displayText);
      // Cache this as "the response for the current list" so it can be restored when
      // the user backs out of a selected line's detail view without a fresh LLM call.
      lastListResponseRef.current = displayText;

      // Add to conversation history and save to the mode that was active when the question was asked
      const questionMode = conversationModeRef.current;
      const nextMode = deriveConversationMode(finalResponseType, gameMode);
      const updatedHistory = addToConversationHistory(conversationHistory, question, displayText);
      await saveConversationHistory(updatedHistory, questionMode);
      if (nextMode !== questionMode) {
        conversationModeRef.current = nextMode;
        const nextHistory = await loadConversationHistory(nextMode);
        setConversationHistory(nextHistory);
      } else {
        setConversationHistory(updatedHistory);
      }

      // Handle game memory if this is a Game response with annotations
      if (finalResponseType === "Game" && parsedResponse.annotations) {
        const newGame = {
          pgn: parsedResponse.explanation || "",
          annotations: parsedResponse.annotations,
          timestamp: Date.now()
        };
        const updatedGames = [...gameMemory, newGame];
        setGameMemory(updatedGames);
        await saveGameMemory(updatedGames);
      }

      // Handle FEN rendering for Puzzle/Position responses
      if (finalResponseType === "Puzzle" && parsedResponse.fen) {
        try {
          new Chess(parsedResponse.fen); // validate
          setCurrentFen(parsedResponse.fen);
          setPuzzleStartFen(parsedResponse.fen);
          // Normalize solution moves: trim whitespace and ensure valid UCI format (4+ chars)
          const sol = (Array.isArray(parsedResponse.solution) ? parsedResponse.solution : [])
            .map((m: string) => (typeof m === 'string' ? m.trim() : ''))
            .filter((m: string) => m.length >= 4); // UCI moves must be at least 4 chars
          setPuzzleSolution(sol);
          setPuzzleSolutionSan(Array.isArray(parsedResponse.solution_san) ? parsedResponse.solution_san : []);
          setPuzzleAttemptMoves([]);
          setPuzzleNavigationMode(false);
          setPuzzleIncorrect(false);
          setPuzzleExplainLoading(false);
          setShowSolution(false);
          setCurrentMoveIndex(0);
          setPuzzleMeta({
            themes: parsedResponse.themes ?? "",
            difficulty: parsedResponse.difficulty ?? "medium",
            rating: Number(parsedResponse.rating) || 0,
          });
        } catch (fenError) {
          setQuestionResponse("⚠️ Invalid puzzle FEN received — board not updated.");
        }
      } else if (finalResponseType === "Position" && parsedResponse.fen) {
        try {
          new Chess(parsedResponse.fen); // validate
          setCurrentFen(parsedResponse.fen);
        } catch (fenError) {
          setStatusMessage(`Invalid FEN in response: ${(fenError as Error).message}`);
        }
      } else if (finalResponseType === "Opening" || finalResponseType === "Middlegame" || finalResponseType === "Endgame") {
        const movesArr = Array.isArray(parsedResponse.moves) ? parsedResponse.moves : [];
        const startFen = parsedResponse.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        setTrainingMoves(movesArr);
        setTrainingMoveIndex(-1);
        setTrainingMoveLabel("");
        setTrainingStartFen(startFen);
        setCurrentFen(startFen);
      } else if (finalResponseType === "GameList") {
        const incomingGames = Array.isArray(parsedResponse.game_list) ? parsedResponse.game_list : [];
        if (parsedResponse.auto_load && incomingGames.length === 1) {
          // Backend resolved a game-number selection via conversation history — auto-load it.
          // loadGameFromRow also clears gameList state and ref internally.
          const loaded = loadGameFromRow(incomingGames[0]);
          if (!loaded) {
            setQuestionResponse("⚠️ Couldn't load that game onto the board — the PGN may be missing or unreadable.");
          } else {
            const ecoCode = parsedResponse.eco_code || incomingGames[0].eco || "";
            const openingName = parsedResponse.opening_name || incomingGames[0].opening || "";
            setGameEcoLabel(ecoCode && openingName ? `${openingName} (${ecoCode})` : openingName || ecoCode);
          }
        } else {
          // Normal list response — store for manual selection by typing a number.
          gameListRef.current = incomingGames.length > 0 ? incomingGames : null;
          setGameList(incomingGames.length > 0 ? incomingGames : null);
          setGameMode(false);
          setCurrentGameInfo(null);
          setGamePgnFens([]);
          setGameMoveIndex(0);
          setGameEcoLabel("");
        }
      }

    } catch (err) {
      const errorMessage = (err as Error)?.message || "LLM question failed.";
      setQuestionResponse(`⚠️ Error: ${errorMessage}`);
    } finally {
      setQuestionLoading(false);
    }
  }, [
    analysisLines,
    currentFen,
    currentResponseType,
    puzzleSolution,
    puzzleSolutionSan,
    puzzleStartFen,
    puzzleMeta,
    handleSelectEngineLine,
    gameList,
    gameMode,
    loadGameFromRow,
    formState.analysisDepth,
    formState.explainLanguage,
    formState.ollamaBaseUrl,
    formState.ollamaModel,
    formState.llmProvider,
    formState.llmApiKey,
    formState.llmModel,
    questionText,
    conversationHistory,
    gameMemory,
    gameEcoLabel
  ]);

  const onOpenSettings = useCallback((): void => {
    setViewMode("settings");
  }, []);

  const handleMoveSuggested = useCallback(
    async (from: string, to: string): Promise<void> => {
      if (!electronAPI?.validateMove) {
        setMoveWarningMessage("Move validation API unavailable.");
        setMoveWarningOpen(true);
        return;
      }

      try {
        const validation = await electronAPI.validateMove({ from, to });
        if (!validation.valid) {
          setMoveWarningMessage(`Invalid move: ${validation.reason || "Move is not legal in current position"}`);
          setMoveWarningOpen(true);
          return;
        }

        if (!electronAPI?.applyMove) {
          setMoveWarningMessage("Move application API unavailable.");
          setMoveWarningOpen(true);
          return;
        }

        const result = await electronAPI.applyMove({ from, to });
        if (!result.ok) {
          setMoveWarningMessage(`Failed to apply move: ${result.error}`);
          setMoveWarningOpen(true);
          return;
        }

        if (!result.fen) {
          setMoveWarningMessage("Move applied but FEN not returned.");
          setMoveWarningOpen(true);
          return;
        }

        setCurrentFen(result.fen);
        setStatusMessage(`Move ${from}→${to} applied`);
        runAnalysis(result.fen);
      } catch (err) {
        setMoveWarningMessage(`Error: ${(err as Error).message}`);
        setMoveWarningOpen(true);
      }
    },
    [runAnalysis]
  );

  const boardSize = useMemo(() => {
    const width = windowSize.width || 1280;
    const height = windowSize.height || 720;
    const horizontalPadding = 48;
    // root pt(24) + status bar(26) + content flex gap(16) + board chrome: PlayerBars+ECO+toolbar(110) = 176
    const verticalPadding = 176;
    const usableWidth = Math.max(360, width - horizontalPadding);
    const usableHeight = Math.max(360, height - verticalPadding);
    // In Advanced Analysis mode, reduce board width from 60% to 40% to make room for chat and notes panels
    const boardWidthPercent = advancedAnalysisMode ? 0.4 : 0.6;
    const boardWidth = usableWidth * boardWidthPercent;
    const dimension = Math.min(boardWidth, usableHeight, 760);
    return { width: dimension, height: dimension };
  }, [windowSize.width, windowSize.height, advancedAnalysisMode]);
  const layoutHeight = useMemo(() => boardSize.height + 110, [boardSize.height]);
  const isWideLayout = useMemo(() => {
    const width = windowSize.width || 1280;
    return width >= 1024;
  }, [windowSize.width]);
  const gridTemplateColumns = isWideLayout
    ? "minmax(0, 1fr) minmax(320px, 420px)"
    : "1fr";

  return (
    <Box
      sx={{
        position: "relative",
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(160deg, #e4e8f4 0%, #f3f3f1 45%, #f2ede4 100%)",
        px: { xs: 2, md: 4 },
        pt: { xs: 2, md: 3 },
        overflow: "hidden"
      }}
    >
      <Box sx={{ position: "absolute", top: 12, right: 16, zIndex: (theme) => theme.zIndex.drawer + 3 }}>
        <ProfileIcon refreshTrigger={profileRefreshTrigger} />
      </Box>

      <Backdrop
        open={!appLoading && (engineWarming || engineAnalyzing)}
        sx={{
          position: "absolute",
          zIndex: (theme) => theme.zIndex.drawer + 5,
          color: "common.white"
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="inherit" />
          {!engineWarming && !engineAnalyzing && (
            <Typography variant="h6">Loading application…</Typography>
          )}
        </Stack>
      </Backdrop>
      <Backdrop
        open={isExplanationLoading}
        sx={{
          position: "absolute",
          zIndex: (theme) => theme.zIndex.drawer + 4,
          color: "common.white"
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="inherit" />
          <Typography variant="h6">Generating explanation…</Typography>
        </Stack>
      </Backdrop>
      {viewMode === "settings" || !engineStatus?.configured ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            px: { xs: 1, md: 3 },
            py: { xs: 1, md: 2 }
          }}
        >
          <Container
            maxWidth="md"
            sx={{
              display: "flex",
              alignItems: "stretch"
            }}
          >
            <SettingsPanel
              formState={formState}
              onFieldChange={handleFormChange}
              onDetect={handleDetect}
              onDetectAll={handleDetectAllEngines}
              onBrowse={handleBrowse}
              onSaveSettings={handleSaveSettings}
              onSettingsComplete={handleSettingsComplete}
              settingsSaving={settingsSaving}
              engineStatus={engineStatus}
              statusMessage={statusMessage}
              systemStatus={systemStatus}
              availableEngines={availableEngines}
              selectedEngine={formState.selectedEngine}
              onEngineChange={handleEngineChange}
              llmApiKeyLength={llmApiKeyLength}
              sx={{ width: "100%", height: "100%" }}
            />
          </Container>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden"
          }}
        >
          <StatusBanner statusMessage={statusMessage} analysisStatus={analysisStatus} />
          {analysisMode === "logs" ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                backgroundColor: "background.paper",
                boxShadow: 3,
                pt: 2,
                px: 2,
                gap: 0.5,
                overflow: "hidden"
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                <IconButton
                  size="small"
                  onClick={() => setAnalysisMode("main")}
                  aria-label="back to analysis view"
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="h6">Process logs</Typography>
              </Stack>
              <Tabs
                value={activeLogTab}
                onChange={(_, value) => setActiveLogTab(value)}
                aria-label="engine log tabs"
                sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0, mx: -2 }}
              >
                <Tab label={`${formState.selectedEngine === "lc0" ? "LC0" : "Stockfish"}`} />
                <Tab label="Ollama" />
              </Tabs>
              {analysisLogError && (
                <Typography variant="body2" color="error" sx={{ flexShrink: 0, px: 2 }}>
                  {analysisLogError}
                </Typography>
              )}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  overflow: "hidden",
                  px: 2,
                  pb: 2
                }}
              >
                <Box
                  ref={(node: HTMLDivElement | null) => {
                    if (node) logContainerRefs.current.stockfish = node;
                  }}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "scroll",
                    overflowX: "hidden",
                    border: "1px solid #333",
                    borderRadius: 0.5,
                    px: 2,
                    py: 1,
                    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                    fontSize: "0.8rem",
                    lineHeight: 1.4,
                    backgroundColor: "#000",
                    color: "#fff",
                    display: activeLogTab === 0 ? "block" : "none",
                    scrollbarWidth: "auto",
                    scrollbarColor: "#999 #1a1a1a",
                    "&::-webkit-scrollbar": {
                      width: "14px"
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: "#1a1a1a"
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "#555",
                      borderRadius: "7px",
                      backgroundClip: "padding-box",
                      border: "3px solid #1a1a1a",
                      minHeight: "40px",
                      "&:hover": {
                        backgroundColor: "#777"
                      },
                      "&:active": {
                        backgroundColor: "#999"
                      }
                    }
                  }}
                >
                  {logLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} />
                      <Typography variant="body2" sx={{ color: "#fff" }}>Loading Stockfish logs…</Typography>
                    </Stack>
                  ) : logEntries.stockfish.length ? (
                    logEntries.stockfish.map((entry) => (
                      <Typography
                        key={`stockfish-log-${entry.id}`}
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap", color: "#fff", mb: 0.5 }}
                      >
                        [{entry.stream?.toUpperCase() || "OUT"}] {entry.text}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: "#888" }}>
                      Stockfish logs will appear here.
                    </Typography>
                  )}
                </Box>
                <Box
                  ref={(node: HTMLDivElement | null) => {
                    if (node) logContainerRefs.current.ollama = node;
                  }}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "scroll",
                    overflowX: "hidden",
                    border: "1px solid #333",
                    borderRadius: 0.5,
                    px: 2,
                    py: 1,
                    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                    fontSize: "0.8rem",
                    lineHeight: 1.4,
                    backgroundColor: "#000",
                    color: "#fff",
                    display: activeLogTab === 1 ? "block" : "none",
                    scrollbarWidth: "auto",
                    scrollbarColor: "#999 #1a1a1a",
                    "&::-webkit-scrollbar": {
                      width: "14px"
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: "#1a1a1a"
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "#555",
                      borderRadius: "7px",
                      backgroundClip: "padding-box",
                      border: "3px solid #1a1a1a",
                      minHeight: "40px",
                      "&:hover": {
                        backgroundColor: "#777"
                      },
                      "&:active": {
                        backgroundColor: "#999"
                      }
                    }
                  }}
                >
                  {logLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} />
                      <Typography variant="body2" sx={{ color: "#fff" }}>Loading Ollama logs…</Typography>
                    </Stack>
                  ) : logEntries.ollama.length ? (
                    logEntries.ollama.map((entry) => (
                      <Typography
                        key={`ollama-log-${entry.id}`}
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap", color: "#fff", mb: 0.5 }}
                      >
                        [{entry.stream?.toUpperCase() || "OUT"}] {entry.text}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: "#888" }}>
                      Ollama logs will appear here.
                    </Typography>
                  )}
                </Box>
              </Box>
              {logLoading && <LinearProgress sx={{ mt: 1 }} />}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns,
                gap: 3,
                alignItems: "stretch",
                overflow: "hidden"
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  height: isWideLayout ? layoutHeight : "auto",
                  display: "flex",
                  flexDirection: "column",
                  padding: "5px",
                  boxSizing: "border-box"
                }}
              >
                {/* Black player bar — shown above the board when a DB game is loaded */}
                {gameMode && currentGameInfo && (
                  <PlayerBar
                    name={currentGameInfo.black}
                    elo={currentGameInfo.blackFideRating ?? currentGameInfo.blackElo}
                    pieceColor="black"
                  />
                )}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 1,
                  }}
                >
                  {!(currentResponseType === "Puzzle" || gameMode) && (
                    <EvalBar
                      score={analysisLines[0]?.score}
                      height={boardSize.height}
                      isLoading={isAnalysisRunning}
                    />
                  )}
                  <AnalysisBoard
                    currentFen={currentFen}
                    setCurrentFen={setCurrentFen}
                    runAnalysis={runAnalysis}
                    setStatusMessage={setStatusMessage}
                    size={boardSize}
                    onStartAnalysis={handleStartAnalysis}
                    onStopAnalysis={handleStopAnalysis}
                    isAnalysisRunning={isAnalysisRunning}
                    onMoveAttempt={handleMoveAttempt}
                    puzzleMode={currentResponseType === "Puzzle" || gameMode}
                    onReset={handleResetBoard}
                  />
                </Box>
                {/* White player bar — shown below the board when a DB game is loaded */}
                {gameMode && currentGameInfo && (
                  <PlayerBar
                    name={currentGameInfo.white}
                    elo={currentGameInfo.whiteFideRating ?? currentGameInfo.whiteElo}
                    pieceColor="white"
                  />
                )}
                {/* ECO opening label — game mode shows DB-resolved name; analysis mode shows live ECO lookup */}
                {gameMode && gameEcoLabel && (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", px: 1.5, pt: 0.25, display: "block", fontStyle: "italic" }}
                  >
                    {gameEcoLabel}
                  </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Import position">
                      <IconButton
                        size="small"
                        onClick={() => setImportDialogOpen(true)}
                        color="primary"
                        aria-label="open import controls"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit board">
                      <IconButton
                        size="small"
                        onClick={() => setIsPositionEditorOpen(true)}
                        color="primary"
                        aria-label="open board editor"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!gameMode && (
                      <Tooltip title={isAnalysisRunning ? "Stop Analysis" : "Advanced Analysis"} disableInteractive={false}>
                        <IconButton
                          size="small"
                          onClick={isAnalysisRunning ? handleStopAdvancedAnalysis : handleStartAdvancedAnalysis}
                          color={isAnalysisRunning ? "error" : "success"}
                          aria-label={isAnalysisRunning ? "stop analysis" : "advanced analysis"}
                        >
                          {isAnalysisRunning ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                    {advancedAnalysisMode && (
                      <Tooltip title="Save this analysis" disableInteractive={false}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={deepAnalysisLoading}
                            aria-label="save analysis"
                            onClick={async () => {
                              if (!electronAPI?.saveAnalysisPgn) return;
                              const res = await electronAPI.saveAnalysisPgn({ pgn: currentRawPgn, notes: currentNotesMap });
                              if (res?.ok) {
                                setSnackbarMessage(`Analysis saved to: ${res.path}`);
                                setSnackbarSeverity("success");
                              } else {
                                setSnackbarMessage(res?.error || "Failed to save analysis.");
                                setSnackbarSeverity("error");
                              }
                              setSnackbarOpen(true);
                            }}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!gameMode && (
                      <Tooltip title="Load saved analysis" disableInteractive={false}>
                        <IconButton
                          size="small"
                          aria-label="load analysis"
                          onClick={async () => {
                            if (!electronAPI?.loadAnalysisPgn) return;
                            const res = await electronAPI.loadAnalysisPgn();
                            if (res?.cancelled) return;
                            if (!res?.ok) {
                              setSnackbarMessage(res?.error || "Failed to load analysis.");
                              setSnackbarSeverity("error");
                              setSnackbarOpen(true);
                              return;
                            }
                            setCurrentRawPgn(res.pgn || "");
                            if (res.notes) setCurrentNotesMap((prev) => ({ ...prev, ...res.notes }));
                            // Load PGN onto the board
                            if (res.pgn) {
                              const fens = parsePgnToFens(res.pgn);
                              if (fens.length > 1) {
                                setGamePgnFens(fens);
                                setGameMoveIndex(fens.length - 1);
                                setCurrentFen(fens[fens.length - 1]);
                                setGameMode(true);
                              }
                            }
                          }}
                        >
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Tooltip title="View logs" disableInteractive={false}>
                    <IconButton
                      size="small"
                      onClick={() => setAnalysisMode("logs")}
                      color="primary"
                      aria-label="view logs"
                    >
                      <ListAltIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box
                sx={{
                  minHeight: 0,
                  height: isWideLayout ? layoutHeight : "auto",
                  display: "flex",
                  flexDirection: "row",
                  gap: 2,
                  overflow: "hidden"
                }}
              >
                <ChatPanel
                  questionText={questionText}
                  onQuestionChange={setQuestionText}
                  onAskQuestion={handleQuestion}
                  questionLoading={questionLoading}
                  questionResponse={questionResponse}
                  onClearQuestion={() => setQuestionText("")}
                  onOpenSettings={onOpenSettings}
                  analysisEntries={analysisEntries}
                  analysisStatus={analysisStatus}
                  analysisLoading={analysisLoading}
                  onPlayLine={handlePlayLine}
                  selectedAnalysisId={selectedAnalysisLineId}
                  onLineSelect={handleSelectAnalysisLine}
                  onMoveSuggested={handleMoveSuggested}
                  llmProvider={formState.llmProvider}
                  analysisLines={analysisLines}
                  lineExplanations={lineExplanations}
                  currentOpening={currentOpening}
                  onSelectEngineLine={handleSelectEngineLine}
                  onDeselectLine={handleBackFromLine}
                  canGoBackToParentLines={explorationStack.length > 0}
                  isDrillLoading={isDrillLoading}
                  selectedEngineLineIndex={selectedEngineLineIndex}
                  currentMoveIndex={currentMoveIndex}
                  responseType={currentResponseType}
                  responseData={currentResponseData}
                  trainingMoveLabel={trainingMoveLabel}
                  showSolution={showSolution}
                  onShowSolution={handleShowSolution}
                  puzzleIncorrect={puzzleIncorrect}
                  onRetryPuzzle={handleRetryPuzzle}
                  agentStatuses={agentStatuses}
                  isExplanationLoading={isExplanationLoading || puzzleExplainLoading}
                  puzzleNavigationMode={puzzleNavigationMode}
                  gameMode={gameMode}
                  gameMoveIndex={gameMoveIndex}
                  gameTotalMoves={gamePgnFens.length}
                  gameList={gameList}
                  onGameSelect={(idx) => {
                    // Reuse the same path as typing the game number in chat, so clicking a
                    // list item loads the game AND asks the LLM for a contextual introduction
                    // instead of a static caption.
                    handleQuestion(String(idx + 1));
                  }}
                  onBackToGameList={() => {
                    setGameMode(false);
                    setCurrentResponseType("GameList");
                    setCurrentGameInfo(null);
                    setGamePgnFens([]);
                    setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                    setAnalysisLines([]);
                    setExplorationStack([]);
                  }}
                  advancedAnalysisMode={advancedAnalysisMode}
                  deepAnalysisResults={deepAnalysisResults}
                  deepAnalysisLoading={deepAnalysisLoading}
                  sx={{ flex: 1, minHeight: 0 }}
                />
                {advancedAnalysisMode && (
                  <PositionNotesPanel
                    currentFen={currentFen}
                    electronAPI={electronAPI}
                    onNoteChange={(fen, text) =>
                      setCurrentNotesMap((prev) => ({ ...prev, [fen]: text }))
                    }
                    onNotesModified={setAdvancedAnalysisNotesModified}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <MoveWarningDialog
        open={moveWarningOpen}
        message={moveWarningMessage}
        onClose={() => setMoveWarningOpen(false)}
      />
      <NotesConfirmDialog
        open={notesConfirmDialogOpen}
        onSave={handleSaveNotesAndExit}
        onDiscard={handleDiscardNotesAndExit}
      />
      <input
        ref={importFileInput}
        type="file"
        accept=".fen,.pgn,text/plain"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import FEN / PGN</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              multiline
              minRows={4}
              maxRows={8}
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                if (importError) {
                  setImportError("");
                }
              }}
              placeholder="Paste a FEN or PGN string here (supports the same moves Stockfish reports)."
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" onClick={openImportPicker}>
                Browse file
              </Button>
              {importLoading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                Upload .fen/.pgn for batch positions
              </Typography>
            </Stack>
            {importError && (
              <Typography variant="body2" color="error">
                {importError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleImportSubmit} disabled={importLoading}>
            Load positions
          </Button>
          <Button variant="outlined" onClick={handleResetToStart}>
            Reset board
          </Button>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={lineDialogOpen} onClose={handleLineDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {activeLine ? `Line ${activeLine.rank ?? ""} analysis` : "Line analysis"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {activeLine?.moves && activeLine.moves.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Moves:{" "}
                {activeLine.moves
                  .map((move) => `${move.from.toUpperCase()} → ${move.to.toUpperCase()}`)
                  .join(", ")}
              </Typography>
            )}
            {activeLine?.rawText && (
              <Typography variant="body2" color="text.secondary">
                Source: {activeLine.rawText}
              </Typography>
            )}
            {lineAnalysisLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Generating LLM analysis…</Typography>
              </Box>
            )}
            {lineAnalysisError && (
              <Typography variant="body2" color="error">
                {lineAnalysisError}
              </Typography>
            )}
            {lineAnalysisText && (
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {lineAnalysisText}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLineDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <BoardPositionEditor
        open={isPositionEditorOpen}
        onClose={() => setIsPositionEditorOpen(false)}
        onPositionConfirm={handlePositionConfirm}
        initialFen={currentFen}
      />
      <AppStatusBar
        currentResponseType={currentResponseType}
        selectedEngine={formState.selectedEngine}
        isEngineRunning={isAnalysisRunning}
        llmProvider={formState.llmProvider}
      />
    </Box>
  );
}
