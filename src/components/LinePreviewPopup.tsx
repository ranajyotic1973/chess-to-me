import { Box, Dialog, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import { useEffect, useMemo, useState } from "react";
import type { Score } from "../types";
import { buildLinePreview } from "../utils/linePreview";
import MiniBoard from "./MiniBoard";
import EvalBar from "./EvalBar";

interface LinePreviewPopupProps {
  open: boolean;
  /** Position the line starts from. */
  startFen: string;
  /** Space-separated UCI moves of the line. */
  pv: string;
  /** The line's engine evaluation (shown on the eval bar). */
  score?: Score | null;
  /** Optional short label for the line (e.g. its SAN summary). */
  lineLabel?: string;
  onClose: () => void;
}

const BOARD_SIZE = 360;

/**
 * A stateless preview of a single engine line. Steps through the line's moves
 * on an isolated board (never touching the main board/game state) using only
 * the keyboard arrow keys. When opened it asks the LLM for insights at the
 * critical moves; each insight shows as a balloon while its move is displayed.
 */
export default function LinePreviewPopup({
  open,
  startFen,
  pv,
  score,
  lineLabel,
  onClose,
}: LinePreviewPopupProps) {
  const preview = useMemo(() => buildLinePreview(startFen, pv), [startFen, pv]);
  const lastIndex = preview.fens.length - 1;
  const [moveIndex, setMoveIndex] = useState(0);
  const [insights, setInsights] = useState<Map<number, string>>(new Map());

  // Reset to the start of the line each time the popup opens for a new line.
  useEffect(() => {
    if (open) {
      setMoveIndex(0);
      setInsights(new Map());
    }
  }, [open, startFen, pv]);

  // Keyboard-only navigation, bounded at the ends of the line.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMoveIndex((i) => Math.min(lastIndex, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMoveIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lastIndex]);

  // Ask the LLM for critical-move insights when the popup opens.
  useEffect(() => {
    if (!open) return;
    const api = typeof window !== "undefined" ? (window as any).electronAPI : null;
    if (!api?.getLinePreviewInsights) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getLinePreviewInsights({ fen: startFen, pv, score });
        if (cancelled || !res?.ok || !Array.isArray(res.insights)) return;
        const map = new Map<number, string>();
        for (const item of res.insights) {
          const idx = Number(item?.moveIndex);
          const text = String(item?.text || "").trim();
          if (Number.isFinite(idx) && text) map.set(idx, text);
        }
        setInsights(map);
      } catch {
        /* insights are advisory — ignore failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, startFen, pv, score]);

  const currentInsight = insights.get(moveIndex);
  const currentPly = moveIndex > 0 ? preview.plies[moveIndex - 1] : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" data-testid="line-preview-popup">
      <Box sx={{ p: 2, pt: 1.5 }}>
        {/* Header: instruction + close */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography variant="caption" data-testid="preview-instruction" sx={{ color: "text.secondary", pt: 0.5 }}>
            Use the ← and → arrow keys to step through the moves.
          </Typography>
          <Tooltip title="Close">
            <IconButton size="small" onClick={onClose} aria-label="close preview" data-testid="close-preview">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {lineLabel && (
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: "monospace" }}>
            {lineLabel}
          </Typography>
        )}

        {/* Insight balloon — shown while a critical move is displayed */}
        <Box sx={{ minHeight: 44, mt: 1 }}>
          {currentInsight && (
            <Box
              data-testid="preview-insight"
              sx={{
                display: "flex",
                gap: 0.75,
                p: 1,
                borderRadius: 1.5,
                backgroundColor: "info.lighter",
                border: 1,
                borderColor: "info.light",
              }}
            >
              <LightbulbIcon fontSize="small" sx={{ color: "warning.main", flexShrink: 0, mt: "1px" }} />
              <Typography variant="caption" sx={{ color: "text.primary" }}>
                {currentInsight}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Board + eval bar */}
        <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "center" }}>
          <EvalBar score={score ?? null} height={BOARD_SIZE} />
          <MiniBoard fen={preview.fens[moveIndex]} size={BOARD_SIZE} />
        </Stack>

        {/* Move position indicator */}
        <Typography variant="caption" data-testid="preview-move-counter" sx={{ display: "block", textAlign: "center", mt: 1, color: "text.secondary" }}>
          {moveIndex === 0 ? "Start" : `Move ${moveIndex} / ${lastIndex}${currentPly ? ` · ${currentPly.san}` : ""}`}
        </Typography>
      </Box>
    </Dialog>
  );
}
