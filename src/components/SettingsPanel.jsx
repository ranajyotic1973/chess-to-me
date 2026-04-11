import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

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
  systemStatus
}) {
  const systemChips = [
    { label: `Platform: ${systemStatus?.platform || "unknown"}`, color: "default" },
    {
      label: systemStatus?.ollamaRunning ? "Ollama running" : "Ollama offline",
      color: systemStatus?.ollamaRunning ? "success" : "error"
    },
    {
      label: systemStatus?.qwen3Installed ? "qwen3 ready" : "qwen3 missing",
      color: systemStatus?.qwen3Installed ? "success" : "error"
    },
    {
      label: systemStatus?.stockfishFound ? "Stockfish ready" : "Stockfish missing",
      color: systemStatus?.stockfishFound ? "success" : "error"
    }
  ];

  return (
    <Paper elevation={3}>
      <Stack spacing={2}>
        <Typography variant="h5">Application settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Provide a valid Stockfish executable and the desired analysis/LLM configuration before moving to the analysis view.
        </Typography>
        <TextField
          label="Stockfish executable"
          value={formState.stockfishPath}
          onChange={(event) => onFieldChange("stockfishPath", event.target.value)}
          fullWidth
          helperText="Required for every position analysis"
        />
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onDetect}>
            Detect
          </Button>
          <Button variant="outlined" onClick={onBrowse}>
            Browse
          </Button>
        </Stack>
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
              label="Language"
              value={formState.explainLanguage}
              onChange={(event) => onFieldChange("explainLanguage", event.target.value)}
              fullWidth
              helperText="LLM response language"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="LLM model"
              value={formState.ollamaModel}
              onChange={(event) => onFieldChange("ollamaModel", event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="LLM base URL"
              value={formState.ollamaBaseUrl}
              onChange={(event) => onFieldChange("ollamaBaseUrl", event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Reference API key (optional)"
              value={formState.referenceApiKey}
              onChange={(event) => onFieldChange("referenceApiKey", event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Reference database users"
              helperText="Comma-separated usernames"
              value={formState.referenceDbUsers}
              onChange={(event) => onFieldChange("referenceDbUsers", event.target.value)}
              fullWidth
            />
          </Grid>
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
