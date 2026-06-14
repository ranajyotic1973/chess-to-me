import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Link
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useEffect, useState, useRef } from "react";
import type { SettingsPanelProps, DbStatus, DbProgressEvent } from "../types";

const PROVIDER_DOCS: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  grok: "https://console.x.ai",
  anthropic: "https://console.anthropic.com",
  gemini: "https://aistudio.google.com/app/apikey"
};

const PROVIDER_ENDPOINTS: Record<string, string> = {
  ollama: "http://localhost:11434/api",
  openai: "https://api.openai.com/v1",
  grok: "https://api.x.ai/v1",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com/v1beta"
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  ollama: "qwen3:8b",
  openai: "gpt-4o",
  grok: "grok-3",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-2.0-flash"
};

function getEnginePath(formState: Record<string, any>, engineName: string): string {
  return formState[`${engineName}Path`] || "";
}

function getApiKeyMask(keyLength: number): string {
  return "•".repeat(Math.max(keyLength, 1));
}

export default function SettingsPanel({
  formState,
  onFieldChange,
  onDetect,
  onDetectAll,
  onBrowse,
  onSaveSettings,
  onSettingsComplete,
  settingsSaving,
  engineStatus,
  statusMessage,
  systemStatus,
  sx,
  availableEngines,
  selectedEngine,
  onEngineChange,
  llmApiKeyLength = 0
}: SettingsPanelProps) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsFetchLoading, setModelsFetchLoading] = useState(false);
  const [modelsFetchError, setModelsFetchError] = useState<string>("");
  const [apiKeyToTest, setApiKeyToTest] = useState<string>("");
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [displayNamePlaceholder, setDisplayNamePlaceholder] = useState<string>("");

  // Database state
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [dbActionLoading, setDbActionLoading] = useState<"puzzles" | "games" | null>(null);
  const [dbProgress, setDbProgress] = useState<DbProgressEvent | null>(null);
  const [dbActionMessage, setDbActionMessage] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<"puzzles" | "games" | null>(null);
  const [gamesImporting, setGamesImporting] = useState<boolean>(false);
  const dbProgressUnsubRef = useRef<(() => void) | null>(null);

  // OTB directory import state
  const [otbDir, setOtbDir] = useState<string>(formState.otbImportDir || "");
  const [otbImporting, setOtbImporting] = useState<boolean>(false);
  const [otbDirProgress, setOtbDirProgress] = useState<{ fileIndex: number; totalFiles: number; fileName: string; message: string } | null>(null);
  const otbProgressUnsubRef = useRef<(() => void) | null>(null);
  const otbCompleteUnsubRef = useRef<(() => void) | null>(null);

  const fetchModelsForProvider = async (apiKey: string, provider: string) => {
    const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;
    if (!electronAPI?.getAvailableModels) {
      return;
    }

    if (!apiKey || provider === "ollama") {
      return;
    }

    try {
      setModelsFetchLoading(true);
      setModelsFetchError("");
      const baseUrl = PROVIDER_ENDPOINTS[provider];
      const result = await electronAPI.getAvailableModels({
        provider,
        apiKey,
        baseUrl
      });

      if (result.ok && result.models && result.models.length > 0) {
        setAvailableModels(result.models);
        // Auto-select first model if not already selected
        if (!formState.ollamaModel) {
          onFieldChange("ollamaModel", result.models[0]);
        }
      } else {
        setModelsFetchError(result.error || "Failed to fetch models");
      }
    } catch (err) {
      setModelsFetchError("Error fetching models");
    } finally {
      setModelsFetchLoading(false);
    }
  };

  // Auto-fetch models on load if API key is available
  useEffect(() => {
    if (formState.llmProvider !== "ollama" && formState.llmApiKey && !hasAutoFetched) {
      setHasAutoFetched(true);
      fetchModelsForProvider(formState.llmApiKey, formState.llmProvider);
    }
  }, []);

  // Auto-fetch models when provider changes if API key is available
  useEffect(() => {
    if (formState.llmProvider !== "ollama" && formState.llmApiKey) {
      // Only fetch if provider changed and is not ollama
      fetchModelsForProvider(formState.llmApiKey, formState.llmProvider);
    }
  }, [formState.llmProvider]);

  const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;

  const fetchDbStatus = async () => {
    if (!electronAPI?.dbStatus) return;
    try {
      const status = await electronAPI.dbStatus();
      setDbStatus(status);
    } catch {}
  };

  useEffect(() => {
    fetchDbStatus();
    // Check if import is already running (e.g. user navigated away and back)
    electronAPI?.dbImportStatus?.().then(state => {
      if (state?.status === "importing") {
        setGamesImporting(true);
        setDbActionLoading("games");
        subscribeToProgress();
      }
    }).catch(() => {});
    // Load display name — resolved value (OS username fallback) becomes placeholder
    electronAPI?.getDisplayName?.().then((name: string) => {
      setDisplayNamePlaceholder(name);
      // Only pre-fill if the user previously set a custom name (not the OS default)
      const savedName = (formState as any).displayName || "";
      setDisplayName(savedName);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!electronAPI?.onDbRefreshStatus) return;
    const unsub = electronAPI.onDbRefreshStatus(() => fetchDbStatus());
    return unsub;
  }, []);

  useEffect(() => {
    if (!electronAPI?.onDbImportComplete) return;
    const unsub = electronAPI.onDbImportComplete((data) => {
      setGamesImporting(false);
      setDbActionLoading(null);
      setDbProgress(null);
      if (dbProgressUnsubRef.current) { dbProgressUnsubRef.current(); dbProgressUnsubRef.current = null; }
      if (data.ok) {
        setDbActionMessage(`Import complete: ${data.count?.toLocaleString()} games indexed`);
      } else {
        setDbActionMessage(`Error: ${data.error}`);
      }
      fetchDbStatus();
    });
    return unsub;
  }, []);

  const subscribeToProgress = () => {
    if (!electronAPI?.onDbProgress) return;
    if (dbProgressUnsubRef.current) dbProgressUnsubRef.current();
    const unsub = electronAPI.onDbProgress((data: DbProgressEvent) => setDbProgress(data));
    dbProgressUnsubRef.current = unsub;
  };

  const handleDownloadPuzzles = async () => {
    if (!electronAPI?.dbDownloadPuzzles) return;
    setDbActionLoading("puzzles");
    setDbProgress(null);
    setDbActionMessage("");
    subscribeToProgress();
    try {
      const result = await electronAPI.dbDownloadPuzzles();
      if (result.ok) {
        setDbActionMessage(`Import complete: ${result.count?.toLocaleString()} puzzles`);
      } else {
        setDbActionMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setDbActionMessage(`Error: ${err.message}`);
    } finally {
      setDbActionLoading(null);
      setDbProgress(null);
      if (dbProgressUnsubRef.current) { dbProgressUnsubRef.current(); dbProgressUnsubRef.current = null; }
      fetchDbStatus();
    }
  };

  const handleCheckPuzzleUpdate = async () => {
    if (!electronAPI?.dbCheckPuzzleUpdate) return;
    setDbActionLoading("puzzles");
    setDbActionMessage("");
    try {
      const result = await electronAPI.dbCheckPuzzleUpdate();
      setDbActionMessage(result.hasUpdate
        ? `Update available (${result.serverDate}). Click Download to update.`
        : "Puzzle database is up to date.");
    } catch {
      setDbActionMessage("Update check failed.");
    } finally {
      setDbActionLoading(null);
    }
  };

  const handleImportGames7z = async () => {
    if (!electronAPI?.dbBrowseGamesFile) return;
    const { filePath } = await electronAPI.dbBrowseGamesFile();
    if (!filePath) return;
    setDbActionLoading("games");
    setDbProgress(null);
    setDbActionMessage("");
    subscribeToProgress();
    try {
      const result = await electronAPI.dbImportGames7z(filePath);
      if (result.started) {
        // Import running in background — progress arrives via db:progress events,
        // completion arrives via onDbImportComplete.
        setGamesImporting(true);
        setDbActionMessage("Import started in background. You can continue using the app!");
      } else if (result.ok) {
        setDbActionMessage(`Import complete: ${result.count?.toLocaleString()} games indexed`);
        setDbActionLoading(null);
        setDbProgress(null);
        if (dbProgressUnsubRef.current) { dbProgressUnsubRef.current(); dbProgressUnsubRef.current = null; }
        fetchDbStatus();
      } else {
        setDbActionMessage(`Error: ${result.error}`);
        setDbActionLoading(null);
        setDbProgress(null);
        if (dbProgressUnsubRef.current) { dbProgressUnsubRef.current(); dbProgressUnsubRef.current = null; }
      }
    } catch (err: any) {
      setDbActionMessage(`Error: ${err.message}`);
      setDbActionLoading(null);
      setDbProgress(null);
      if (dbProgressUnsubRef.current) { dbProgressUnsubRef.current(); dbProgressUnsubRef.current = null; }
    }
  };

  const handleDeleteDb = async (which: "puzzles" | "games") => {
    setDeleteConfirm(null);
    if (!electronAPI) return;
    try {
      if (which === "puzzles") await electronAPI.dbDeletePuzzles();
      else await electronAPI.dbDeleteGames();
    } catch {}
    setDbActionMessage("");
    fetchDbStatus();
  };

  const handleBrowseOtbDir = async () => {
    if (!electronAPI?.browseOtbDir) return;
    const { dirPath } = await electronAPI.browseOtbDir();
    if (!dirPath) return;
    setOtbDir(dirPath);
    onFieldChange("otbImportDir", dirPath);
  };

  const handleImportOtbDir = async () => {
    if (!otbDir || !electronAPI?.importOtbDir) return;
    setOtbImporting(true);
    setDbActionLoading("games");
    setOtbDirProgress(null);
    setDbActionMessage("");

    if (otbProgressUnsubRef.current) otbProgressUnsubRef.current();
    otbProgressUnsubRef.current = electronAPI.onOtbDirProgress((data) => {
      setOtbDirProgress({ fileIndex: data.fileIndex, totalFiles: data.totalFiles, fileName: data.fileName, message: data.message });
    });

    if (otbCompleteUnsubRef.current) otbCompleteUnsubRef.current();
    otbCompleteUnsubRef.current = electronAPI.onOtbDirComplete((data) => {
      setOtbImporting(false);
      setDbActionLoading(null);
      setOtbDirProgress(null);
      if (otbProgressUnsubRef.current) { otbProgressUnsubRef.current(); otbProgressUnsubRef.current = null; }
      if (otbCompleteUnsubRef.current) { otbCompleteUnsubRef.current(); otbCompleteUnsubRef.current = null; }
      if (data.imported === 0 && data.errors === 0) {
        setDbActionMessage(data.skipped > 0
          ? `All ${data.skipped} file(s) already imported — nothing new to add.`
          : "No OTB archive files found in the selected directory.");
      } else {
        setDbActionMessage(`OTB import complete: ${data.imported} imported, ${data.skipped} already done, ${data.errors} error(s).`);
      }
      fetchDbStatus();
    });

    try {
      const result = await electronAPI.importOtbDir(otbDir);
      if (!result.ok) {
        setOtbImporting(false);
        setDbActionLoading(null);
        setOtbDirProgress(null);
        if (otbProgressUnsubRef.current) { otbProgressUnsubRef.current(); otbProgressUnsubRef.current = null; }
        if (otbCompleteUnsubRef.current) { otbCompleteUnsubRef.current(); otbCompleteUnsubRef.current = null; }
        setDbActionMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setOtbImporting(false);
      setDbActionLoading(null);
      setOtbDirProgress(null);
      if (otbProgressUnsubRef.current) { otbProgressUnsubRef.current(); otbProgressUnsubRef.current = null; }
      if (otbCompleteUnsubRef.current) { otbCompleteUnsubRef.current(); otbCompleteUnsubRef.current = null; }
      setDbActionMessage(`Error: ${err.message}`);
    }
  };

  const fmtBytes = (b: number) => b > 1e9 ? `${(b/1e9).toFixed(1)} GB` : `${(b/1e6).toFixed(0)} MB`;

  const availableModelList = Array.isArray(systemStatus?.availableModels)
    ? systemStatus.availableModels.filter(Boolean)
    : [];
  const modelOptions = [...new Set([...(availableModelList || []), formState.ollamaModel || "qwen3:8b"])];

  // Check if engine is installed either from system-check or from filled path in formState
  const enginePathFilled = Boolean(getEnginePath(formState, selectedEngine || ""));
  const selectedEngineFound = enginePathFilled || availableEngines?.some(
    (engine) => engine.name === selectedEngine && engine.status === "installed"
  );

  return (
    <Paper
      elevation={3}
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        p: { xs: 2, md: 3 },
        bgcolor: "background.paper",
        ...sx
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h5">Application settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Select a chess engine (Stockfish or LC0) and configure your LLM provider before moving to the analysis view.
        </Typography>

        <Typography variant="h6">Profile</Typography>
        <TextField
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          fullWidth
          placeholder={displayNamePlaceholder}
          helperText="Leave blank to use your system username"
          inputProps={{ maxLength: 50 }}
        />

        <Typography variant="h6">Chess Engine</Typography>
        <FormControl fullWidth>
          <InputLabel id="engine-select-label">Engine</InputLabel>
          <Select
            labelId="engine-select-label"
            label="Engine"
            value={selectedEngine || ""}
            onChange={(event) => onEngineChange?.(event.target.value)}
          >
            <MenuItem value="lc0">
              Leela (LC0) - {getEnginePath(formState, "lc0") || availableEngines?.some((e) => e.name === "lc0" && e.status === "installed") ? "Installed" : "Not installed"}
            </MenuItem>
            <MenuItem value="stockfish">
              Stockfish - {getEnginePath(formState, "stockfish") || availableEngines?.some((e) => e.name === "stockfish" && e.status === "installed") ? "Installed" : "Not installed"}
            </MenuItem>
          </Select>
          {selectedEngineFound ? (
            <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
              ✓ Auto-detected at {getEnginePath(formState, selectedEngine || "")}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Chess engine not configured
            </Typography>
          )}
        </FormControl>

        {!selectedEngineFound && (
          <>
            <TextField
              label="Chess engine executable path"
              value={getEnginePath(formState, selectedEngine || "")}
              onChange={(event) => onFieldChange?.(`${selectedEngine}Path`, event.target.value)}
              fullWidth
              helperText="Path to engine binary (e.g., /usr/local/bin/lc0 or C:\\Program Files\\Stockfish\\stockfish.exe)"
            />
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Auto-detect engine">
                <IconButton onClick={onDetect} color="primary" size="small">
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Browse for engine executable">
                <IconButton onClick={onBrowse} size="small">
                  <FolderOpenIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </>
        )}

        <Typography variant="h6">LLM Analysis</Typography>
        <FormControl fullWidth>
          <InputLabel id="llm-provider-label">LLM Provider</InputLabel>
          <Select
            labelId="llm-provider-label"
            label="LLM Provider"
            value={formState.llmProvider}
            onChange={(event) => {
              const newProvider = String(event.target.value);

              // Update provider immediately
              onFieldChange("llmProvider", newProvider);

              // Only auto-set model for Ollama; for cloud providers, wait for user to fetch and select
              if (newProvider === "ollama") {
                const defaultModel = PROVIDER_DEFAULT_MODELS[newProvider] || "qwen3:8b";
                onFieldChange("ollamaModel", defaultModel);
              } else {
                // Clear model for cloud providers so user must fetch and select
                onFieldChange("ollamaModel", "");
              }

              // Reset available models when provider changes
              setAvailableModels([]);
              setModelsFetchError("");
            }}
          >
            <MenuItem value="ollama">Ollama (Local)</MenuItem>
            <MenuItem value="openai">OpenAI (ChatGPT)</MenuItem>
            <MenuItem value="grok">Grok (xAI)</MenuItem>
            <MenuItem value="anthropic">Anthropic (Claude)</MenuItem>
            <MenuItem value="gemini">Google Gemini</MenuItem>
          </Select>
        </FormControl>

        {formState.llmProvider !== "ollama" && (
          <Stack spacing={2}>
            <TextField
              label="API Key"
              type="password"
              value={apiKeyToTest || formState.llmApiKey || (llmApiKeyLength > 0 ? getApiKeyMask(llmApiKeyLength) : "")}
              onChange={(event) => {
                setApiKeyToTest(event.target.value);
                onFieldChange("llmApiKey", event.target.value);
                setModelsFetchError("");
              }}
              onFocus={(event) => {
                (event.target as HTMLInputElement).select();
              }}
              placeholder={llmApiKeyLength > 0 && !apiKeyToTest ? "••••••• (saved)" : "Enter your API key"}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={`Get API key from ${formState.llmProvider}`}>
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => electronAPI?.openExternalUrl?.(PROVIDER_DOCS[formState.llmProvider])}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
            {apiKeyToTest && (
              <Tooltip title={modelsFetchLoading ? "Saving & fetching models…" : "Save API key & fetch available models"}>
                <span>
                  <IconButton
                    color="primary"
                    onClick={async () => {
                      const trimmedKey = apiKeyToTest.trim();
                      onFieldChange("llmApiKey", trimmedKey);
                      await fetchModelsForProvider(trimmedKey, formState.llmProvider);
                      setApiKeyToTest("");
                    }}
                    disabled={modelsFetchLoading}
                  >
                    {modelsFetchLoading ? <CircularProgress size={22} /> : <SaveIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {modelsFetchError && (
              <Typography variant="body2" color="error">
                {modelsFetchError}
              </Typography>
            )}
          </Stack>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Analysis depth"
              type="number"
              inputProps={{ min: 6, max: 30 }}
              value={formState.analysisDepth}
              onChange={(event) => onFieldChange("analysisDepth", event.target.value)}
              fullWidth
              helperText="6-30"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Engine timeout (seconds)"
              type="number"
              inputProps={{ min: 5, max: 300 }}
              value={Math.round((formState.engineTimeoutMs ?? 120000) / 1000)}
              onChange={(event) => onFieldChange("engineTimeoutMs", Number(event.target.value) * 1000)}
              fullWidth
              helperText="5–300s — engine stops after timeout"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="language-label">Language</InputLabel>
              <Select
                labelId="language-label"
                label="Language"
                value={formState.explainLanguage}
                onChange={(event) => onFieldChange("explainLanguage", event.target.value)}
              >
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="German">German</MenuItem>
                <MenuItem value="Dutch">Dutch</MenuItem>
                <MenuItem value="Spanish">Spanish</MenuItem>
                <MenuItem value="Norwegian">Norwegian</MenuItem>
                <MenuItem value="Mandarin">Mandarin Chinese</MenuItem>
                <MenuItem value="Japanese">Japanese</MenuItem>
                <MenuItem value="Korean">Korean</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {formState.llmProvider === "ollama" && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="ollama-model-label">LLM model</InputLabel>
                  <Select
                    labelId="ollama-model-label"
                    label="LLM model"
                    value={formState.ollamaModel}
                    onChange={(event) => onFieldChange("ollamaModel", event.target.value)}
                  >
                    {modelOptions.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                  {systemStatus?.lastModelError && (
                    <Typography variant="caption" color="error">
                      {systemStatus.lastModelError}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </>
          )}
          {formState.llmProvider !== "ollama" && (
            <Grid item xs={12} sm={6}>
              {availableModels.length > 0 ? (
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    label="Model"
                    value={formState.llmModel || ""}
                    onChange={(event) => onFieldChange("llmModel", event.target.value)}
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Model"
                  value={formState.llmModel || ""}
                  onChange={(event) => onFieldChange("llmModel", event.target.value)}
                  fullWidth
                  helperText="Enter model name or fetch available models with API key"
                />
              )}
            </Grid>
          )}
        </Grid>

        {/* ── Puzzle Settings ─────────────────────────────────────────── */}
        <Divider />
        <Typography variant="h6" sx={{ mt: 1 }}>Puzzle Settings</Typography>
        <Box>
          <Typography variant="body2" gutterBottom>
            Puzzle difficulty range (ELO rating): {formState.puzzleRatingMin ?? 1000} – {formState.puzzleRatingMax ?? 1500}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Puzzles within this ELO range will be selected. Lower = easier, higher = harder.
          </Typography>
          <Slider
            value={[formState.puzzleRatingMin ?? 1000, formState.puzzleRatingMax ?? 1500]}
            onChange={(_event, value) => {
              const [min, max] = value as number[];
              onFieldChange("puzzleRatingMin", min);
              onFieldChange("puzzleRatingMax", max);
            }}
            min={400}
            max={3000}
            step={50}
            marks={[
              { value: 400, label: "400" },
              { value: 1000, label: "1000" },
              { value: 1500, label: "1500" },
              { value: 2000, label: "2000" },
              { value: 2500, label: "2500" },
              { value: 3000, label: "3000" }
            ]}
            valueLabelDisplay="auto"
            disableSwap
          />
        </Box>

        {/* ── Databases ───────────────────────────────────────────────── */}
        <Divider />
        <Typography variant="h6" sx={{ mt: 1 }}>Databases</Typography>

        {dbActionMessage && (
          <Alert severity={dbActionMessage.startsWith("Error") ? "error" : "success"} onClose={() => setDbActionMessage("")}>
            {dbActionMessage}
          </Alert>
        )}
        {(dbActionLoading) && dbProgress && (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{dbProgress.message}</Typography>
            <LinearProgress variant="determinate" value={dbProgress.percent} />
          </Box>
        )}
        {(dbActionLoading) && !dbProgress && (
          <LinearProgress />
        )}

        <Grid container spacing={2}>
          {/* Puzzle Database */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Puzzle Database</Typography>
              {dbStatus?.puzzles ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {dbStatus.puzzles.count.toLocaleString()} puzzles &bull; {fmtBytes(dbStatus.puzzles.sizeBytes)}
                  {dbStatus.puzzles.version ? ` &bull; ${dbStatus.puzzles.version}` : ""}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Not downloaded</Typography>
              )}
              <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                <Tooltip title={dbStatus?.puzzles ? "Re-download puzzle database" : "Download puzzle database"}>
                  <span>
                    <IconButton onClick={handleDownloadPuzzles} disabled={!!dbActionLoading} color="primary" size="small">
                      <CloudDownloadIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                {dbStatus?.puzzles && (
                  <Tooltip title="Check for puzzle updates">
                    <span>
                      <IconButton onClick={handleCheckPuzzleUpdate} disabled={!!dbActionLoading} size="small">
                        <SyncIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {dbStatus?.puzzles && (
                  <Tooltip title="Delete puzzle database">
                    <span>
                      <IconButton onClick={() => setDeleteConfirm("puzzles")} disabled={!!dbActionLoading} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Games Database */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Games Database</Typography>

              {/* Status line */}
              {(gamesImporting || otbImporting) ? (
                <Typography variant="body2" color="info.main" sx={{ mt: 0.5 }}>
                  {otbDirProgress
                    ? `File ${otbDirProgress.fileIndex} of ${otbDirProgress.totalFiles}: ${otbDirProgress.fileName} — ${otbDirProgress.message}`
                    : dbProgress ? dbProgress.message : "Importing in background…"}
                </Typography>
              ) : dbStatus?.games ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {dbStatus.games.count.toLocaleString()} games &bull; {fmtBytes(dbStatus.games.sizeBytes)}
                  {dbStatus.games.source ? ` · ${dbStatus.games.source}` : ""}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No database yet — import files below to build your game library.
                </Typography>
              )}

              {/* OTB bulk import instructions */}
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Build a complete OTB games library
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Visit{" "}
                  <Link
                    component="button"
                    variant="caption"
                    onClick={() => electronAPI?.openExternalUrl?.("https://lumbrasgigabase.com/en/download-in-pgn-format-en/")}
                    sx={{ cursor: "pointer" }}
                  >
                    lumbrasgigabase.com
                  </Link>
                  {" "}and download all <strong>OTB *.7z</strong> files into a single folder on your computer.
                  For monthly updates, add the new file to the same folder and click Import All again — already-imported files are skipped automatically.
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Select folder containing OTB archive files…"
                    value={otbDir}
                    onChange={(e) => setOtbDir(e.target.value)}
                    sx={{ flex: 1 }}
                    inputProps={{ readOnly: false }}
                  />
                  <Tooltip title="Browse for folder">
                    <span>
                      <IconButton onClick={handleBrowseOtbDir} disabled={!!dbActionLoading} size="small">
                        <FolderOpenIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Import all OTB archive files from folder">
                    <span>
                      <IconButton onClick={handleImportOtbDir} disabled={!otbDir || !!dbActionLoading} color="primary" size="small">
                        {otbImporting ? <CircularProgress size={20} /> : <UnarchiveIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Single-file import and delete */}
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                <Tooltip title={gamesImporting ? "Importing…" : "Import a single PGN or .7z file"}>
                  <span>
                    <IconButton onClick={handleImportGames7z} disabled={!!dbActionLoading} size="small">
                      {gamesImporting ? <CircularProgress size={20} /> : <UploadFileIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
                {dbStatus?.games && (
                  <Tooltip title="Delete games database">
                    <span>
                      <IconButton onClick={() => setDeleteConfirm("games")} disabled={!!dbActionLoading} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
          <DialogTitle>Delete {deleteConfirm === "puzzles" ? "Puzzle" : "Games"} Database?</DialogTitle>
          <DialogContent>
            <Typography>
              This will permanently delete the local database file. You can re-download it anytime.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button color="error" onClick={() => deleteConfirm && handleDeleteDb(deleteConfirm)}>Delete</Button>
          </DialogActions>
        </Dialog>

        {statusMessage ? <Alert severity="info">{statusMessage}</Alert> : null}

        {/* Credits */}
        <Divider />
        <Box sx={{ pt: 0.5 }}>
          <Typography variant="caption" color="text.disabled" component="div" sx={{ lineHeight: 1.8 }}>
            <strong>Data credits</strong>
            {"  ·  "}
            Puzzles:{" "}
            <Link
              component="button"
              variant="caption"
              onClick={() => electronAPI?.openExternalUrl?.("https://lichess.org/training")}
              sx={{ cursor: "pointer" }}
            >
              Lichess.org
            </Link>
            {" "}(CC0 open database)
            {"  ·  "}
            Games:{" "}
            <Link
              component="button"
              variant="caption"
              onClick={() => electronAPI?.openExternalUrl?.("https://lumbrasgigabase.com/")}
              sx={{ cursor: "pointer" }}
            >
              Lumbrasgigabase.com
            </Link>
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={() => {
            electronAPI?.setDisplayName?.(displayName);
            onSaveSettings();
          }} disabled={settingsSaving}>
            Save settings
          </Button>
          <Button variant="contained" color="secondary" startIcon={<PlayArrowIcon />} onClick={onSettingsComplete} disabled={!engineStatus?.configured}>
            Go to analysis
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
