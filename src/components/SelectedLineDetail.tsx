import { Box, Stack, Chip, IconButton, Typography, Skeleton } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import type { AnalysisEntry, DeepLineAnalysis } from "../types";
import { formatHighlightedMoveNotation } from "../utils/formatHighlightedMoveNotation";

interface SelectedLineDetailProps {
  selectedLineNum: number | null;
  selectedEngineLineIndex: number | null;
  analysisEntries: AnalysisEntry[];
  currentMoveIndex: number;
  onDeselectLine?: () => void;
  advancedAnalysisMode?: boolean;
  deepAnalysisLoading?: boolean;
  deepAnalysisResults?: Record<number, DeepLineAnalysis>;
}

const DEEP_ANALYSIS_FIELDS: Array<{ key: keyof DeepLineAnalysis; label: string }> = [
  { key: "strategy", label: "Strategy" },
  { key: "proscons", label: "Pros & Cons" },
  { key: "counterattack", label: "Counter-attack" },
  { key: "sacrifice", label: "Sacrifice" },
  { key: "novelty", label: "Novelty" },
  { key: "endgameChances", label: "Endgame chances" },
  { key: "alternatives", label: "Alternatives" },
];

/**
 * SelectedLineDetail displays the details of a selected engine analysis line.
 * Shows the line moves with current move highlighting, a deselect button, and advanced analysis if enabled.
 */
export default function SelectedLineDetail({
  selectedLineNum,
  selectedEngineLineIndex,
  analysisEntries,
  currentMoveIndex,
  onDeselectLine,
  advancedAnalysisMode = false,
  deepAnalysisLoading = false,
  deepAnalysisResults = {},
}: SelectedLineDetailProps) {
  if (selectedEngineLineIndex === null) {
    return null;
  }

  const entry = analysisEntries[selectedEngineLineIndex];
  if (!entry) {
    return null;
  }

  return (
    <Box sx={{ p: 1.5, backgroundColor: "info.lighter", borderRadius: 1, border: 1, borderColor: "info.light" }}>
      {/* Header with line number and deselect button */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip
          label={`Line ${selectedLineNum} selected`}
          size="small"
          color="primary"
          variant="outlined"
        />
        <IconButton
          size="small"
          onClick={() => onDeselectLine?.()}
          title="Deselect line"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Display the selected line's moves with the current move highlighted in bold + yellow square */}
      <Typography variant="body2" sx={{ fontFamily: "monospace", mb: 1 }}>
        {formatHighlightedMoveNotation(entry.description || "", currentMoveIndex)}
      </Typography>

      {/* Deep analysis fields (shown only in advanced analysis mode) */}
      {advancedAnalysisMode && selectedEngineLineIndex !== null && (
        deepAnalysisLoading && deepAnalysisResults[selectedEngineLineIndex] === undefined ? (
          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
            {DEEP_ANALYSIS_FIELDS.map((f) => (
              <Box key={f.key}>
                <Skeleton variant="text" width="30%" sx={{ mb: 0.25 }} />
                <Skeleton variant="rectangular" height={40} />
              </Box>
            ))}
          </Box>
        ) : deepAnalysisResults[selectedEngineLineIndex] ? (
          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {DEEP_ANALYSIS_FIELDS.map((f) => (
              <Box key={f.key}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", display: "block" }}>
                  {f.label}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {deepAnalysisResults[selectedEngineLineIndex]![f.key as keyof DeepLineAnalysis]}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null
      )}
    </Box>
  );
}
