import { Box, Stack, Typography } from "@mui/material";
import { Chess } from "chess.js";
import { useEffect, useState, useRef } from "react";
import type { AnalysisEntry, DeepLineAnalysis } from "../types";

interface SelectedLineDetailProps {
  playedMoves: string[];
  selectedLineIndex: number | null;
  selectedLineEntry?: AnalysisEntry | null;
  analysisEntries: AnalysisEntry[];
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

export default function SelectedLineDetail({
  playedMoves,
  selectedLineIndex,
  selectedLineEntry,
  analysisEntries,
  advancedAnalysisMode = false,
  deepAnalysisLoading = false,
  deepAnalysisResults = {},
}: SelectedLineDetailProps) {
  const [navigationIndex, setNavigationIndex] = useState(playedMoves.length - 1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update navigation index when played moves change
  useEffect(() => {
    setNavigationIndex(Math.max(0, playedMoves.length - 1));
  }, [playedMoves.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setNavigationIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setNavigationIndex((prev) => Math.min(playedMoves.length - 1, prev + 1));
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener("keydown", handleKeyDown);
      return () => element.removeEventListener("keydown", handleKeyDown);
    }
  }, [playedMoves.length]);

  if (playedMoves.length === 0) {
    return null;
  }

  const entry = selectedLineIndex !== null ? (selectedLineEntry || analysisEntries[selectedLineIndex]) : null;

  // Convert moves to SAN format
  const convertToSAN = () => {
    const chess = new Chess();
    return playedMoves.map((uciMove) => {
      const moveObj: any = { from: uciMove.substring(0, 2), to: uciMove.substring(2, 4) };
      const toRank = parseInt(uciMove[3]);
      const piece = chess.get(moveObj.from);
      if (piece && piece.type === 'p' && (toRank === 8 || toRank === 1)) {
        moveObj.promotion = 'q';
      }
      return chess.move(moveObj)?.san || uciMove;
    });
  };

  const sanMoves = convertToSAN();

  return (
    <Box
      ref={containerRef}
      tabIndex={0}
      sx={{
        p: 1.5,
        backgroundColor: "info.lighter",
        borderRadius: 1,
        border: 1,
        borderColor: "info.light",
        outline: "none",
        "&:focus": { borderColor: "primary.main" },
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>
        Moves Played
      </Typography>

      <Typography variant="body2" sx={{ fontFamily: "monospace", mb: 1 }}>
        {sanMoves.map((move, idx) => {
          const moveNum = Math.floor(idx / 2) + 1;
          const isWhiteMove = idx % 2 === 0;
          const moveNumberLabel = isWhiteMove ? `${moveNum}. ` : "";
          return (
            <span key={idx}>
              {idx > 0 && " "}
              {moveNumberLabel}
              <span
                style={{
                  fontWeight: idx === navigationIndex ? "bold" : "normal",
                  backgroundColor: idx === navigationIndex ? "#FFFF00" : "transparent",
                  padding: idx === navigationIndex ? "2px 4px" : "0",
                }}
              >
                {move}
              </span>
            </span>
          );
        })}
      </Typography>

      {advancedAnalysisMode && selectedLineIndex !== null && entry && (
        <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
          {deepAnalysisResults[selectedLineIndex] ? (
            DEEP_ANALYSIS_FIELDS.map((f) => (
              <Box key={f.key}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", display: "block" }}>
                  {f.label}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {deepAnalysisResults[selectedLineIndex]![f.key as keyof DeepLineAnalysis]}
                </Typography>
              </Box>
            ))
          ) : null}
        </Box>
      )}
    </Box>
  );
}
