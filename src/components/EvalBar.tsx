import { Box, Typography } from "@mui/material";
import type { Score } from "../types";
import { scoreToWhitePct, scoreToLabel } from "../utils/evalBarUtils";

interface EvalBarProps {
  score: Score | null | undefined;
  height: number;
  isLoading?: boolean;
}

export default function EvalBar({ score, height, isLoading }: EvalBarProps) {
  const whitePct = scoreToWhitePct(score);
  const blackPct = 100 - whitePct;
  const label = scoreToLabel(score);

  // Keep the label in the centre of whichever region is larger so it always
  // sits on a solid background.  White region = bottom portion; black = top.
  const labelInWhite = whitePct >= 50;
  const labelTop = labelInWhite
    ? `${100 - whitePct / 2}%`   // centre of the white (bottom) portion
    : `${blackPct / 2}%`;         // centre of the black (top) portion
  const labelColor = labelInWhite ? "#1a1a1a" : "#f0f0f0";

  return (
    <Box
      aria-label={`Evaluation: ${label}`}
      sx={{
        width: 24,
        height,
        flexShrink: 0,
        position: "relative",
        borderRadius: "4px",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.22)",
        opacity: isLoading ? 0.65 : 1,
        transition: "opacity 0.3s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
      }}
    >
      {/* Black portion — top of the bar */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${blackPct}%`,
          backgroundColor: "#2d2d2d",
          transition: "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* White portion — bottom of the bar */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${whitePct}%`,
          backgroundColor: "#f0ede6",
          transition: "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Thin divider line at the black/white boundary */}
      <Box
        sx={{
          position: "absolute",
          top: `${blackPct}%`,
          left: 0,
          right: 0,
          height: "2px",
          backgroundColor: "rgba(128,128,128,0.5)",
          transform: "translateY(-50%)",
          transition: "top 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Eval label — centred inside the dominant colour region */}
      <Box
        sx={{
          position: "absolute",
          top: labelTop,
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.56rem",
            fontWeight: 800,
            color: labelColor,
            lineHeight: 1,
            userSelect: "none",
            letterSpacing: 0.4,
            // Vertical text reading bottom-to-top (standard chess eval bar convention)
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
