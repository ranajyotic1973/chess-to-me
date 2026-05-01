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
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListAltIcon from "@mui/icons-material/ListAlt";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsPanel from "./components/SettingsPanel";
import AnalysisBoard from "./components/AnalysisBoard";
import ChatPanel from "./components/ChatPanel";
import StatusBanner from "./components/StatusBanner";
import {
  deriveFenSequence,
  parseFenOrPgnInput,
  parseStockfishLine
} from "./utils/analysisHelpers";
import type {
  AnalysisEntry,
  AnalysisLine,
  AppSettings,
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
  explainLanguage: "English",
  ollamaModel: "qwen3:8b",
  ollamaBaseUrl: "http://localhost:11434/api"
};

const normalizeModelName = (value: string | null | undefined): string => String(value || "").trim();

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
    return window.localStorage.getItem(SETTINGS_FLAG) === "true" ? "analysis" : "settings";
  });
  const [formState, setFormState] = useState<AppSettings>(DEFAULT_FORM);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [analysisLines, setAnalysisLines] = useState<AnalysisLine[]>([]);
  const [analysisEntries, setAnalysisEntries] = useState<AnalysisEntry[]>([]);
  const [selectedAnalysisLineId, setSelectedAnalysisLineId] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"main" | "logs">("main");
  const [logEntries, setLogEntries] = useState<{ stockfish: LogEntry[]; ollama: LogEntry[] }>({ stockfish: [], ollama: [] });
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [analysisLogError, setAnalysisLogError] = useState<string>("");
  const [activeLogTab, setActiveLogTab] = useState<number>(0);
  const logContainerRefs = useRef<{ stockfish: HTMLDivElement | null; ollama: HTMLDivElement | null }>({ stockfish: null, ollama: null });
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [lineDialogOpen, setLineDialogOpen] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<AnalysisEntry | null>(null);
  const [lineAnalysisText, setLineAnalysisText] = useState<string>("");
  const [lineAnalysisLoading, setLineAnalysisLoading] = useState<boolean>(false);
  const [lineAnalysisError, setLineAnalysisError] = useState<string>("");
  const [currentFen, setCurrentFen] = useState<string>("start");
  const [questionText, setQuestionText] = useState<string>("");
  const [questionResponse, setQuestionResponse] = useState<string>("");
  const [questionLoading, setQuestionLoading] = useState<boolean>(false);
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("start");
  const [importError, setImportError] = useState<string>("");
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720
  }));
  const [availableEngines, setAvailableEngines] = useState<EngineInfo[]>([]);
  const importFileInput = useRef<HTMLInputElement>(null);
  const userSelectedModelRef = useRef<boolean>(false);

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
    if (!electronAPI?.getEngineStatus) {
      return;
    }
    try {
      const status = await electronAPI.getEngineStatus();
      setEngineStatus(status);
      setFormState((prev) => ({
        ...prev,
        stockfishPath: status.stockfishPath || prev.stockfishPath,
        lc0Path: status.lc0Path || prev.lc0Path,
        selectedEngine: (status.selectedEngine as "stockfish" | "lc0") || prev.selectedEngine,
        analysisDepth: Number(status.settings?.analysisDepth) || prev.analysisDepth,
        explainLanguage: status.settings?.explainLanguage || prev.explainLanguage,
        ollamaModel: status.settings?.ollamaModel || prev.ollamaModel,
        ollamaBaseUrl: status.settings?.ollamaBaseUrl || prev.ollamaBaseUrl
      }));
      userSelectedModelRef.current = Boolean(status.settings?.ollamaModel);
    } catch (err) {
      setStatusMessage("Unable to read saved engine settings.");
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

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setAppLoading(true);
      try {
        await Promise.all([fetchSystemStatus(), loadEngineStatus()]);
      } catch (err) {
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
  }, [fetchSystemStatus, loadEngineStatus]);

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

  useEffect(() => {
    if (analysisMode !== "logs") {
      return undefined;
    }
    loadLogs();
    const interval = setInterval(loadLogs, 2500);
    return () => clearInterval(interval);
  }, [analysisMode, loadLogs]);

  useEffect(() => {
    if (analysisMode !== "logs") {
      return;
    }
    const bucket = activeLogTab === 0 ? "stockfish" : "ollama";
    const container = logContainerRefs.current[bucket];
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [analysisMode, activeLogTab, logEntries]);

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
          model: formState.ollamaModel,
          baseUrl: formState.ollamaBaseUrl
        });
      } catch (err) {
        // Handle error silently
      }
    },
    [formState.explainLanguage, formState.ollamaModel, formState.ollamaBaseUrl]
  );

  const handleAnalysisSuccess = useCallback(
    (lines: AnalysisLine[], fen: string): void => {
      setAnalysisLines(lines);
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
    async (fen: string): Promise<void> => {
      if (!electronAPI?.analyzePosition) {
        setAnalysisStatus("Analysis engine unavailable.");
        return;
      }
      setAnalysisLoading(true);
      setAnalysisStatus("");
      try {
        const response = await electronAPI.analyzePosition({
          fen,
          depth: formState.analysisDepth,
          multiPv: 4
        });
        if (!response?.ok) {
          setAnalysisStatus((response as any)?.error || "Stockfish failed to return analysis.");
          setAnalysisLines([]);
          setAnalysisEntries([]);
              return;
        }
        const lines = (response as any).analysis?.lines || [];
        handleAnalysisSuccess(lines, fen);
      } catch (err) {
        setAnalysisStatus("Stockfish analysis failed.");
        setAnalysisLines([]);
        setAnalysisEntries([]);
        } finally {
        setAnalysisLoading(false);
      }
    },
    [formState.analysisDepth, handleAnalysisSuccess]
  );

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
      setFormState((prev) => ({ ...prev, [key]: value }));
      if (key === "ollamaModel" && electronAPI?.setOllamaModel) {
        const selected = String(value) || DEFAULT_FORM.ollamaModel;
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
    },
    []
  );

  const handleDetect = useCallback(async (): Promise<void> => {
    const selectedEngine = formState.selectedEngine || "lc0";
    if (!electronAPI?.detectEngine) {
      setStatusMessage("Auto-detect is unavailable.");
      return;
    }
    setStatusMessage(`Scanning for ${selectedEngine.toUpperCase()}...`);
    try {
      const result = await electronAPI.detectEngine({ engine: selectedEngine });
      if (result?.found && result?.path) {
        setFormState((prev) => ({ ...prev, [`${selectedEngine}Path`]: result.path }));
        setStatusMessage(`${selectedEngine.toUpperCase()} path auto-detected.`);
        return;
      }
      setStatusMessage(`${selectedEngine.toUpperCase()} could not be detected automatically.`);
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
        setStatusMessage("Selected file is not a valid engine.");
        return;
      }
      setFormState((prev) => ({ ...prev, [`${selectedEngine}Path`]: response.path || prev[`${selectedEngine}Path` as keyof AppSettings] }));
      setStatusMessage(`${selectedEngine.toUpperCase()} executable selected.`);
    } catch (err) {
      setStatusMessage(`Unable to browse for ${selectedEngine.toUpperCase()}.`);
    }
  }, [formState.selectedEngine]);

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    const selectedEngine = formState.selectedEngine || "lc0";
    const selectedPath = formState[`${selectedEngine}Path` as keyof AppSettings];

    if (!selectedPath) {
      setStatusMessage(`Please provide a ${selectedEngine.toUpperCase()} executable path.`);
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
        setStatusMessage(`${selectedEngine.toUpperCase()} path validation failed.`);
        return;
      }
      const configResult = await electronAPI.updateAppSettings({
        selectedEngine: selectedEngine as "stockfish" | "lc0",
        [`${selectedEngine}Path`]: String(selectedPath),
        analysisDepth: Number(formState.analysisDepth),
        explainLanguage: formState.explainLanguage,
        ollamaModel: formState.ollamaModel,
        ollamaBaseUrl: formState.ollamaBaseUrl
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
      setStatusMessage(`Settings saved and ${selectedEngine.toUpperCase()} validated.`);
      fetchSystemStatus();
    } catch (err) {
      setStatusMessage("Unable to save settings.");
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
    const selectedEngine = formState.selectedEngine || "lc0";
    if (!engineStatus?.configured) {
      setStatusMessage(`Please configure ${selectedEngine.toUpperCase()} before entering the analysis view.`);
      return;
    }
    setViewMode("analysis");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_FLAG, "true");
    }
  }, [engineStatus, formState.selectedEngine]);

  const handleResetToStart = useCallback((): void => {
    setImportText("start");
    setAnalysisStatus("");
    applyPositions(["start"], "Start position loaded.");
  }, [applyPositions]);

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
          model: formState.ollamaModel,
          baseUrl: formState.ollamaBaseUrl
        });
        if (!response?.ok || !response.answer) {
          const fallback = (response as any)?.error || "LLM did not return any analysis.";
          setLineAnalysisError(`${fallback} (ensure Ollama is reachable at ${formState.ollamaBaseUrl})`);
        } else {
          setLineAnalysisText(response.answer);
        }
      } catch (err) {
        setLineAnalysisError("LLM analysis failed.");
      } finally {
        setLineAnalysisLoading(false);
      }
    },
    [analysisLines, currentFen, formState.explainLanguage, formState.ollamaBaseUrl, formState.ollamaModel]
  );

  const handleAnalysisIconClick = useCallback((): void => {
    const selectedEntry = analysisEntries.find((entry) => entry.id === selectedAnalysisLineId);
    if (!selectedEntry) {
      setStatusMessage("Select an analysis line before showing the LLM output.");
      return;
    }
    handleShowLine(selectedEntry);
  }, [analysisEntries, handleShowLine, selectedAnalysisLineId]);

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

  const handleQuestion = useCallback(async (): Promise<void> => {
    const question = String(questionText || "").trim();
    if (!question) {
      setStatusMessage("Ask a question about the current position.");
      return;
    }
    if (!electronAPI?.askQuestion) {
      setStatusMessage("LLM question API unavailable.");
      return;
    }
    setQuestionLoading(true);
    setQuestionResponse(""); // Clear previous response
    try {
      const response = await electronAPI.askQuestion({
        question,
        fen: currentFen,
        lines: analysisLines,
        language: formState.explainLanguage,
        model: formState.ollamaModel,
        baseUrl: formState.ollamaBaseUrl
      });
      if (!response?.ok) {
        const errorMsg = (response as any)?.error || "No response from LLM.";
        setQuestionResponse(`⚠️ Error: ${errorMsg}`);
        return;
      }
      setQuestionResponse(response.answer || "No answer returned.");
    } catch (err) {
      const errorMessage = (err as Error)?.message || "LLM question failed.";
      setQuestionResponse(`⚠️ Error: ${errorMessage}`);
    } finally {
      setQuestionLoading(false);
    }
  }, [
    analysisLines,
    currentFen,
    formState.explainLanguage,
    formState.ollamaBaseUrl,
    formState.ollamaModel,
    questionText
  ]);

  const onOpenSettings = useCallback((): void => {
    setViewMode("settings");
  }, []);

  const boardSize = useMemo(() => {
    const width = windowSize.width || 1280;
    const height = windowSize.height || 720;
    const horizontalPadding = 48;
    const verticalPadding = 96;
    const usableWidth = Math.max(360, width - horizontalPadding);
    const usableHeight = Math.max(360, height - verticalPadding);
    const boardWidth = usableWidth * 0.6;
    const dimension = Math.min(boardWidth, usableHeight, 760);
    return { width: dimension, height: dimension };
  }, [windowSize.width, windowSize.height]);
  const layoutHeight = useMemo(() => boardSize.height + 64, [boardSize.height]);
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
        minHeight: "100vh",
        height: "100vh",
        width: "100%",
        background: "linear-gradient(160deg, #e4e8f4 0%, #f3f3f1 45%, #f2ede4 100%)",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
        overflow: "hidden"
      }}
    >
      <Backdrop
        open={appLoading}
        sx={{
          position: "absolute",
          zIndex: (theme) => theme.zIndex.drawer + 5,
          color: "common.white"
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="inherit" />
          <Typography variant="h6">Loading application…</Typography>
        </Stack>
      </Backdrop>
      {viewMode === "settings" ? (
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            px: { xs: 1, md: 3 },
            py: { xs: 1, md: 2 }
          }}
        >
          <Container
            maxWidth="md"
            sx={{
              height: "100%",
              overflow: "hidden",
              display: "flex",
              alignItems: "stretch"
            }}
          >
            <SettingsPanel
              formState={formState}
              onFieldChange={handleFormChange}
              onDetect={handleDetect}
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
                p: 2,
                gap: 2
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
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
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Stockfish" />
                <Tab label="Ollama" />
              </Tabs>
              {analysisLogError && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {analysisLogError}
                </Typography>
              )}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1
                }}
              >
                <Box
                  ref={(node: HTMLDivElement | null) => {
                    if (node) logContainerRefs.current.stockfish = node;
                  }}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    backgroundColor: "background.default",
                    display: activeLogTab === 0 ? "block" : "none"
                  }}
                >
                  {logLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} />
                      <Typography variant="body2">Loading Stockfish logs…</Typography>
                    </Stack>
                  ) : logEntries.stockfish.length ? (
                    logEntries.stockfish.map((entry) => (
                      <Typography
                        key={`stockfish-log-${entry.id}`}
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        [{entry.stream?.toUpperCase() || "OUT"}] {entry.text}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
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
                    overflowY: "auto",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    backgroundColor: "background.default",
                    display: activeLogTab === 1 ? "block" : "none"
                  }}
                >
                  {logLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} />
                      <Typography variant="body2">Loading Ollama logs…</Typography>
                    </Stack>
                  ) : logEntries.ollama.length ? (
                    logEntries.ollama.map((entry) => (
                      <Typography
                        key={`ollama-log-${entry.id}`}
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        [{entry.stream?.toUpperCase() || "OUT"}] {entry.text}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
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
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start"
                  }}
                >
                  <AnalysisBoard
                    currentFen={currentFen}
                    setCurrentFen={setCurrentFen}
                    runAnalysis={runAnalysis}
                    setStatusMessage={setStatusMessage}
                    size={boardSize}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => setImportDialogOpen(true)}
                      color="primary"
                      aria-label="open import controls"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleAnalysisIconClick}
                      color="primary"
                      aria-label="show analysis"
                      disabled={!selectedAnalysisLineId}
                    >
                      <InsightsIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <IconButton
                    size="small"
                    onClick={() => setAnalysisMode("logs")}
                    color="primary"
                    aria-label="view logs"
                  >
                    <ListAltIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box
                sx={{
                  minHeight: 0,
                  height: isWideLayout ? layoutHeight : "auto",
                  display: "flex",
                  flexDirection: "column",
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
                  sx={{ flex: 1, minHeight: 0 }}
                />
              </Box>
            </Box>
          )}
        </Box>
      )}
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
    </Box>
  );
}
