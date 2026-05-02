import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Link
} from "@mui/material";
import { useState } from "react";
import type { SettingsPanelProps } from "../types";

const PROVIDER_DOCS: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  grok: "https://console.x.ai",
  anthropic: "https://console.anthropic.com",
  gemini: "https://aistudio.google.com/app/apikey"
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

  const handleFetchModels = async () => {
    const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;
    if (!electronAPI?.getAvailableModels) {
      setModelsFetchError("API unavailable");
      return;
    }

    const keyToUse = apiKeyToTest || formState.llmApiKey || "";
    if (formState.llmProvider !== "ollama" && !keyToUse) {
      setModelsFetchError("Please enter an API key");
      return;
    }

    setModelsFetchLoading(true);
    setModelsFetchError("");

    try {
      const result = await electronAPI.getAvailableModels({
        provider: formState.llmProvider,
        apiKey: keyToUse
      });

      if (result.ok) {
        setAvailableModels(result.models || []);
        // Auto-select first model if available
        if (result.models && result.models.length > 0 && !formState.ollamaModel) {
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
  const systemChips = [
    { label: `Platform: ${systemStatus?.platform || "unknown"}`, color: "default" as const },
    {
      label: systemStatus?.ollamaRunning ? "Ollama serve running" : "Ollama offline",
      color: systemStatus?.ollamaRunning ? ("success" as const) : ("error" as const)
    },
    {
      label: systemStatus?.ollamaRunActive ? "Ollama model active" : "Ollama model idle",
      color: systemStatus?.ollamaRunActive ? ("success" as const) : ("warning" as const)
    },
    {
      label: `Model: ${systemStatus?.activeModel || formState.ollamaModel}`,
      color: "default" as const
    },
    {
      label: systemStatus?.qwen3Installed ? "qwen3 ready" : "qwen3 missing",
      color: systemStatus?.qwen3Installed ? ("success" as const) : ("error" as const)
    }
  ];
  const availableModelList = Array.isArray(systemStatus?.availableModels)
    ? systemStatus.availableModels.filter(Boolean)
    : [];
  const modelOptions = [...new Set([...(availableModelList || []), formState.ollamaModel || "qwen3:8b"])];

  const selectedEngineFound = availableEngines?.some(
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

        <Typography variant="h6">Chess Engine</Typography>
        <FormControl fullWidth>
          <InputLabel id="engine-select-label">Engine</InputLabel>
          <Select
            labelId="engine-select-label"
            label="Engine"
            value={selectedEngine || ""}
            onChange={(event) => onEngineChange?.(event.target.value)}
          >
            {availableEngines?.map((engine) => (
              <MenuItem key={engine.name} value={engine.name}>
                {engine.name.toUpperCase()} - {engine.status === "installed" ? "Installed" : "Not found"}
              </MenuItem>
            ))}
          </Select>
          {selectedEngineFound ? (
            <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
              ✓ Auto-detected at {getEnginePath(formState, selectedEngine || "")}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {selectedEngine?.toUpperCase()} not configured
            </Typography>
          )}
        </FormControl>

        {!selectedEngineFound && (
          <>
            <TextField
              label={`${selectedEngine?.toUpperCase() || "Engine"} executable path`}
              value={getEnginePath(formState, selectedEngine || "")}
              onChange={(event) => onFieldChange?.(`${selectedEngine}Path`, event.target.value)}
              fullWidth
              helperText="Path to engine binary (e.g., /usr/local/bin/lc0 or C:\\Program Files\\LC0\\lc0.exe)"
            />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onDetect} size="small">
                Auto-detect
              </Button>
              <Button variant="outlined" onClick={onBrowse} size="small">
                Browse
              </Button>
            </Stack>
          </>
        )}

        <Typography variant="h6">LLM Analysis</Typography>
        <FormControl fullWidth>
          <InputLabel id="llm-provider-label">LLM Provider</InputLabel>
          <Select
            labelId="llm-provider-label"
            label="LLM Provider"
            value={formState.llmProvider || "ollama"}
            onChange={(event) => {
              const provider = event.target.value;
              onFieldChange("llmProvider", provider);
              // Only auto-set model for Ollama; for cloud providers, wait for user to fetch and select
              if (provider === "ollama") {
                const defaultModel = PROVIDER_DEFAULT_MODELS[provider] || "qwen3:8b";
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
                setModelsFetchError("");
              }}
              onFocus={(event) => {
                // Select all text on focus for easy replacement
                (event.target as HTMLInputElement).select();
              }}
              placeholder={llmApiKeyLength > 0 && !apiKeyToTest ? "••••••• (saved)" : "Enter your API key"}
              fullWidth
              helperText={
                <span>
                  Get your API key from{" "}
                  <Link
                    href={PROVIDER_DOCS[formState.llmProvider] || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ cursor: "pointer" }}
                  >
                    {formState.llmProvider} console
                  </Link>
                </span>
              }
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={handleFetchModels}
                disabled={modelsFetchLoading}
                sx={{ flexShrink: 0 }}
              >
                {modelsFetchLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                {modelsFetchLoading ? "Fetching..." : "Test & Fetch Models"}
              </Button>
              {apiKeyToTest && (
                <Button
                  variant="contained"
                  onClick={() => {
                    onFieldChange("llmApiKey", apiKeyToTest);
                    setApiKeyToTest("");
                    setModelsFetchError("");
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  Save API Key
                </Button>
              )}
            </Stack>
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
                    value={formState.ollamaModel || ""}
                    onChange={(event) => onFieldChange("ollamaModel", event.target.value)}
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
                  value={formState.ollamaModel}
                  onChange={(event) => onFieldChange("ollamaModel", event.target.value)}
                  fullWidth
                  helperText="Enter model name or fetch available models with API key"
                />
              )}
            </Grid>
          )}
        </Grid>
        {statusMessage ? <Alert severity="info">{statusMessage}</Alert> : null}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="contained" color="primary" onClick={onSaveSettings} disabled={settingsSaving}>
            Save settings
          </Button>
          <Button variant="contained" color="secondary" onClick={onSettingsComplete} disabled={!engineStatus?.configured}>
            Go to analysis
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {systemChips.map((chip) => (
            <Chip key={chip.label} label={chip.label} color={chip.color} size="small" />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
