import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import type { ResponseType } from "../types";

interface DbCounts {
  puzzles: number | null;
  games: number | null;
}

interface AppStatusBarProps {
  currentResponseType: ResponseType;
  selectedEngine: string;
  isEngineRunning: boolean;
  llmProvider: string;
}

const MODE_LABELS: Record<ResponseType, string> = {
  Analysis: "Analysis",
  Puzzle: "Puzzle",
  Position: "Position",
  Opening: "Opening",
  Endgame: "Endgame",
  Game: "Game Review",
  GameList: "Game Review",
};

const MODE_COLORS: Record<ResponseType, string> = {
  Analysis: "#4a9eff",
  Puzzle: "#f59e0b",
  Position: "#4a9eff",
  Opening: "#22c55e",
  Endgame: "#a855f7",
  Game: "#ec4899",
  GameList: "#ec4899",
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function AppStatusBar({
  currentResponseType,
  selectedEngine,
  isEngineRunning,
  llmProvider,
}: AppStatusBarProps) {
  const [counts, setCounts] = useState<DbCounts>({ puzzles: null, games: null });

  const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;

  const refresh = async () => {
    if (!electronAPI?.dbStatus) return;
    try {
      const s = await electronAPI.dbStatus();
      setCounts({
        puzzles: s?.puzzles?.count ?? null,
        games: s?.games?.count ?? null,
      });
    } catch {}
  };

  useEffect(() => {
    refresh();

    const unsubs: Array<() => void> = [];
    if (electronAPI?.onDbRefreshStatus) unsubs.push(electronAPI.onDbRefreshStatus(refresh));
    if (electronAPI?.onDbImportComplete) unsubs.push(electronAPI.onDbImportComplete(refresh));
    if (electronAPI?.onOtbDirComplete) unsubs.push(electronAPI.onOtbDirComplete(refresh));

    return () => unsubs.forEach(u => u());
  }, []);

  const engineLabel = selectedEngine === "lc0" ? "LC0" : "Stockfish";
  const modeLabel = MODE_LABELS[currentResponseType] ?? "Analysis";
  const modeColor = MODE_COLORS[currentResponseType] ?? "#4a9eff";

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 26,
        bgcolor: "rgba(15, 20, 30, 0.92)",
        backdropFilter: "blur(4px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        px: 2,
        gap: 0,
        zIndex: 1400,
        userSelect: "none",
      }}
    >
      {/* Left section: mode + engine */}
      <Stack direction="row" spacing={0} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        {/* Mode pill */}
        <Box
          sx={{
            px: 1.25,
            height: 26,
            display: "flex",
            alignItems: "center",
            bgcolor: modeColor,
            color: "#fff",
            borderRight: "1px solid rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, lineHeight: 1, letterSpacing: 0.4 }}>
            {modeLabel.toUpperCase()}
          </Typography>
        </Box>

        {/* Engine */}
        <Box
          sx={{
            px: 1.5,
            height: 26,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: isEngineRunning ? "#22c55e" : "rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
            {engineLabel}
          </Typography>
        </Box>

        {/* LLM provider */}
        <Box
          sx={{
            px: 1.5,
            height: 26,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>
            {llmProvider}
          </Typography>
        </Box>
      </Stack>

      {/* Right section: DB counts + credits */}
      <Stack direction="row" spacing={0} alignItems="center" sx={{ flexShrink: 0 }}>
        {counts.puzzles !== null && (
          <Tooltip title="Puzzle database (Lichess)" placement="top">
            <Box
              sx={{
                px: 1.5,
                height: 26,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                cursor: "default",
              }}
            >
              <Typography sx={{ fontSize: "0.65rem", lineHeight: 1 }}>🧩</Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>
                {fmtCount(counts.puzzles)} puzzles
              </Typography>
            </Box>
          </Tooltip>
        )}

        {counts.games !== null && (
          <Tooltip title="Games database (Lumbrasgigabase)" placement="top">
            <Box
              sx={{
                px: 1.5,
                height: 26,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                cursor: "default",
              }}
            >
              <Typography sx={{ fontSize: "0.65rem", lineHeight: 1 }}>♜</Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>
                {fmtCount(counts.games)} games
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Credits */}
        <Box
          sx={{
            px: 1.5,
            height: 26,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            borderLeft: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>
            Puzzles:{" "}
          </Typography>
          <Typography
            component="span"
            onClick={() => electronAPI?.openExternalUrl?.("https://lichess.org/training")}
            sx={{
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1,
              cursor: "pointer",
              textDecoration: "underline",
              "&:hover": { color: "rgba(255,255,255,0.7)" },
            }}
          >
            Lichess
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", lineHeight: 1, px: 0.25 }}>
            ·
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>
            Games:{" "}
          </Typography>
          <Typography
            component="span"
            onClick={() => electronAPI?.openExternalUrl?.("https://lumbrasgigabase.com/")}
            sx={{
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1,
              cursor: "pointer",
              textDecoration: "underline",
              "&:hover": { color: "rgba(255,255,255,0.7)" },
            }}
          >
            Lumbrasgigabase
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
