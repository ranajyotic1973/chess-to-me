import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SettingsPanel from "./components/SettingsPanel";
import AnalysisBoard from "./components/AnalysisBoard";
import ChatPanel from "./components/ChatPanel";

const electronAPI = typeof window !== "undefined" ? window.electronAPI : null;
const SETTINGS_FLAG = "chess-to-me:settings-saved";

const DEFAULT_FORM = {
  stockfishPath: "",
  analysisDepth: 16,
  explainLanguage: "English",
  ollamaModel: "qwen3",
  ollamaBaseUrl: "http://localhost:11434/api",
  referenceApiKey: "",
  referenceDbUsers: ""
};

const formatScore = (score) => {
  if (!score) {
    return "Score unknown";
  }
  if (score.type === "mate") {
    return `Mate ${score.value}`;
  }
  return `CP ${score.value}`;
};

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "settings";
    return window.localStorage.getItem(SETTINGS_FLAG) === "true" ? "analysis" : "settings";
  });
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [engineStatus, setEngineStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("Load a FEN string or move pieces on the board.");
  const [analysisLines, setAnalysisLines] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [currentFen, setCurrentFen] = useState("start");
  const [fenInput, setFenInput] = useState("start");
  const [questionText, setQuestionText] = useState("");
  const [questionResponse, setQuestionResponse] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [fenDialogOpen, setFenDialogOpen] = useState(false);
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720
  }));

  const fetchSystemStatus = useCallback(async () => {
    if (!electronAPI?.getSystemStatus) {
      return;
    }
    try {
      const status = await electronAPI.getSystemStatus();
      setSystemStatus(status);
    } catch (err) {
      setStatusMessage("Unable to fetch system status.");
    }
  }, []);

  const loadEngineStatus = useCallback(async () => {
    if (!electronAPI?.getEngineStatus) {
      return;
    }
    try {
      const status = await electronAPI.getEngineStatus();
      setEngineStatus(status);
      setFormState((prev) => ({
        ...prev,
        stockfishPath: status.path || prev.stockfishPath,
        analysisDepth: Number(status.settings?.analysisDepth) || prev.analysisDepth,
        explainLanguage: status.settings?.explainLanguage || prev.explainLanguage,
        ollamaModel: status.settings?.ollamaModel || prev.ollamaModel,
        ollamaBaseUrl: status.settings?.ollamaBaseUrl || prev.ollamaBaseUrl,
        referenceApiKey: status.settings?.referenceApiKey || prev.referenceApiKey,
        referenceDbUsers: status.settings?.referenceDbUsers || prev.referenceDbUsers
      }));
    } catch (err) {
      setStatusMessage("Unable to read saved engine settings.");
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    loadEngineStatus();
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

  const fetchExplanations = useCallback(
    async (fen, lines) => {
      if (!lines?.length || !electronAPI?.explainLines) {
        setExplanations([]);
        return;
      }
      try {
        const response = await electronAPI.explainLines({
          fen,
          lines,
          language: formState.explainLanguage,
          model: formState.ollamaModel,
          baseUrl: formState.ollamaBaseUrl
        });
        if (response?.ok) {
          setExplanations(response.explanations || []);
        } else {
          setExplanations([]);
        }
      } catch (err) {
        setExplanations([]);
      }
    },
    [formState.explainLanguage, formState.ollamaModel, formState.ollamaBaseUrl]
  );

  const runAnalysis = useCallback(
    async (fen) => {
      if (!electronAPI?.analyzePosition) {
        setAnalysisStatus("Analysis engine unavailable.");
        return;
      }
      setAnalysisLoading(true);
      setAnalysisStatus("Running Stockfish...");
      try {
        const response = await electronAPI.analyzePosition({
          fen,
          depth: formState.analysisDepth,
          multiPv: 4
        });
        if (!response?.ok) {
          setAnalysisStatus(response?.error || "Stockfish failed to return analysis.");
          setAnalysisLines([]);
          setExplanations([]);
          return;
        }
        const lines = response.analysis?.lines || [];
        setAnalysisLines(lines);
        setAnalysisStatus("Analysis ready.");
        fetchExplanations(fen, lines);
      } catch (err) {
        setAnalysisStatus("Stockfish analysis failed.");
        setAnalysisLines([]);
        setExplanations([]);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [fetchExplanations, formState.analysisDepth]
  );

  const handleFormChange = useCallback((key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDetect = useCallback(async () => {
    if (!electronAPI?.detectStockfish) {
      setStatusMessage("Auto-detect is unavailable.");
      return;
    }
    setStatusMessage("Scanning for Stockfish...");
    try {
      const result = await electronAPI.detectStockfish();
      if (result?.found && result?.path) {
        setFormState((prev) => ({ ...prev, stockfishPath: result.path }));
        setStatusMessage("Stockfish path auto-detected.");
        return;
      }
      setStatusMessage("Stockfish could not be detected automatically.");
    } catch (err) {
      setStatusMessage("Auto-detection failed.");
    }
  }, []);

  const handleBrowse = useCallback(async () => {
    if (!electronAPI?.browseStockfish) {
      setStatusMessage("Browse dialog unavailable.");
      return;
    }
    try {
      const response = await electronAPI.browseStockfish();
      if (!response?.selected) {
        setStatusMessage("No executable selected.");
        return;
      }
      if (!response.valid) {
        setStatusMessage("Selected file is not a valid engine.");
        return;
      }
      setFormState((prev) => ({ ...prev, stockfishPath: response.path || prev.stockfishPath }));
      setStatusMessage("Stockfish executable selected.");
    } catch (err) {
      setStatusMessage("Unable to browse for Stockfish.");
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!formState.stockfishPath) {
      setStatusMessage("Please provide a Stockfish executable path.");
      return;
    }
    if (!electronAPI?.setStockfishPath || !electronAPI?.updateAppSettings) {
      setStatusMessage("Renderer APIs are not ready.");
      return;
    }
    setSettingsSaving(true);
    setStatusMessage("Validating and saving settings...");
    try {
      const pathResult = await electronAPI.setStockfishPath(formState.stockfishPath);
      if (!pathResult?.ok) {
        setStatusMessage("Stockfish path validation failed.");
        return;
      }
      const configResult = await electronAPI.updateAppSettings({
        analysisDepth: Number(formState.analysisDepth),
        explainLanguage: formState.explainLanguage,
        ollamaModel: formState.ollamaModel,
        ollamaBaseUrl: formState.ollamaBaseUrl,
        referenceApiKey: formState.referenceApiKey,
        referenceDbUsers: formState.referenceDbUsers
      });
      if (!configResult?.ok) {
        setStatusMessage("Failed to persist application settings.");
        return;
      }
      setEngineStatus((prev) => ({
        ...prev,
        configured: true,
        path: formState.stockfishPath,
        settings: configResult.settings
      }));
      setStatusMessage("Settings saved and Stockfish validated.");
      fetchSystemStatus();
    } catch (err) {
      setStatusMessage("Unable to save settings.");
    } finally {
      setSettingsSaving(false);
    }
  }, [fetchSystemStatus, formState]);

  const handleSettingsComplete = useCallback(() => {
    if (!engineStatus?.configured) {
      setStatusMessage("Please configure Stockfish before entering the analysis view.");
      return;
    }
    setViewMode("analysis");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_FLAG, "true");
    }
  }, [engineStatus]);

  const handleApplyFen = useCallback(() => {
    const rawFen = String(fenInput || "").trim();
    if (!rawFen) {
      setStatusMessage("Enter a FEN string to load a position.");
      return;
    }
    const parts = rawFen.split(/\s+/);
    if (parts.length !== 6) {
      setStatusMessage("Invalid FEN: must contain six fields.");
      return;
    }
    setCurrentFen(rawFen);
    setStatusMessage("FEN loaded.");
    runAnalysis(rawFen);
  }, [fenInput, runAnalysis]);

  const handleResetToStart = useCallback(() => {
    setFenInput("start");
    setCurrentFen("start");
    setStatusMessage("Start position loaded.");
    runAnalysis("start");
  }, [runAnalysis]);

  const handleQuestion = useCallback(async () => {
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
    setStatusMessage("Sending question to LLM...");
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
        setStatusMessage(response?.error || "No response from LLM.");
        return;
      }
      setQuestionResponse(response.answer || "No answer returned.");
      setStatusMessage("LLM answered your question.");
    } catch (err) {
      setStatusMessage("LLM question failed.");
    } finally {
      setQuestionLoading(false);
    }
  }, [analysisLines, currentFen, formState.explainLanguage, formState.ollamaBaseUrl, formState.ollamaModel, questionText]);

  const onOpenSettings = useCallback(() => {
    setViewMode("settings");
  }, []);

  const analysisSummary = useMemo(() => {
    return analysisLines.map((line) => ({
      rank: line.rank,
      score: formatScore(line.score),
      pv: line.pv || "No PV available"
    }));
  }, [analysisLines]);

  const boardSize = useMemo(() => {
    const width = windowSize.width || 1280;
    const height = windowSize.height || 720;
    const horizontalPadding = 48;
    const verticalPadding = 96;
    const leftWidth = Math.max(360, (width - horizontalPadding) * 0.7 - 24);
    const leftHeight = Math.max(360, height - verticalPadding);
    const paddedWidth = Math.max(0, leftWidth - 10);
    const paddedHeight = Math.max(0, leftHeight - 10);
    const dimension = Math.min(paddedWidth, paddedHeight, 760);
    return { width: dimension, height: dimension };
  }, [windowSize.width, windowSize.height]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: "100vh",
        width: "100%",
        background: "linear-gradient(160deg, #e4e8f4 0%, #f3f3f1 45%, #f2ede4 100%)",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
        overflow: "hidden"
      }}
    >
      {viewMode === "settings" ? (
        <Box sx={{ height: "100%", overflow: "hidden" }}>
          <Container maxWidth="md" sx={{ height: "100%" }}>
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
            />
          </Container>
        </Box>
      ) : (
        <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              gap: 3,
              flexDirection: { xs: "column", md: "row" }
            }}
          >
            <Box
              sx={{
                flex: "7 1 0%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                padding: "5px",
                boxSizing: "border-box"
              }}
            >
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                <AnalysisBoard
                  currentFen={currentFen}
                  setCurrentFen={setCurrentFen}
                  runAnalysis={runAnalysis}
                  setStatusMessage={setStatusMessage}
                  size={boardSize}
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setFenDialogOpen(true)}
                  color="primary"
                  aria-label="open FEN controls"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box
              sx={{
                flex: "3 1 0%",
                minWidth: { xs: "100%", md: 320 },
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minHeight: 0
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
                analysisLines={analysisSummary}
                analysisStatus={analysisStatus}
                analysisLoading={analysisLoading}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </Stack>
      )}
      <Dialog open={fenDialogOpen} onClose={() => setFenDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>FEN controls</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              multiline
              minRows={3}
              maxRows={6}
              value={fenInput}
              onChange={(event) => setFenInput(event.target.value)}
              placeholder="Paste a FEN string or drag pieces to create one"
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => {
                  handleApplyFen();
                  setFenDialogOpen(false);
                }}
              >
                Apply FEN
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  handleResetToStart();
                  setFenDialogOpen(false);
                }}
              >
                Use start position
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {analysisLoading && <CircularProgress size={20} />}
              <Typography variant="body2" color="text.secondary">
                {analysisStatus}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFenDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
