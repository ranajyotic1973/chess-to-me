import { Box, Typography } from "@mui/material";
import type { AnalysisEntry } from "../types";
import { selectedLineMovesText } from "../utils/analysisHelpers";

interface SelectedLineMovesProps {
  /** The currently selected engine line entry, or null when nothing is selected. */
  entry: AnalysisEntry | null;
  /** Section number shown as a prefix on the heading (e.g. 2 → "2. Moves of selected line"). */
  index?: number;
}

/**
 * Read-only control listing the full move sequence (SAN) of the currently
 * selected engine line, styled to match the "Moves Played" block. Renders
 * nothing when no line is selected or the line has no moves.
 */
export default function SelectedLineMoves({ entry, index }: SelectedLineMovesProps) {
  const moves = selectedLineMovesText(entry);
  if (!moves) {
    return null;
  }

  const heading = index != null ? `${index}. Moves of selected line` : "Moves of selected line";

  return (
    <Box
      data-testid="selected-line-moves"
      sx={{
        p: 1.5,
        backgroundColor: "info.lighter",
        borderRadius: 1,
        border: 1,
        borderColor: "info.light",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>
        {heading}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontFamily: "monospace", lineHeight: 2 }}>
        {moves}
      </Typography>
    </Box>
  );
}
