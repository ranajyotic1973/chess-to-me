import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { ResponseType } from "../types";

interface DbCounts {
  puzzles: number | null;
  games: number | null;
}

// Each active background process registers a slot here.
// Highest numeric priority wins the centre display.
interface BgSlot {
  priority: number;
  text: string;
  detail?: string;
  percent?: number; // 0-100; drives the progress bar
  color?: string;
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
  Middlegame: "Middlegame",
  Endgame: "Endgame",
  Game: "Game Review",
  GameList: "Game Review",
};

const MODE_COLORS: Record<ResponseType, string> = {
  Analysis: "#2563eb",
  Puzzle: "#d97706",
  Position: "#2563eb",
  Opening: "#16a34a",
  Middlegame: "#0891b2",
  Endgame: "#7c3aed",
  Game: "#db2777",
  GameList: "#db2777",
};

const DIVIDER = "rgba(0,0,0,0.09)";
const TEXT = "rgba(10,15,31,0.65)";
const TEXT_DIM = "rgba(10,15,31,0.4)";
const BAR_BG = "rgba(232, 226, 215, 0.97)";

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function Txt({
  children, dim = false, bold = false, color, truncate = false,
}: {
  children: React.ReactNode;
  dim?: boolean;
  bold?: boolean;
  color?: string;
  truncate?: boolean;
}) {
  return (
    <Typography
      sx={{
        fontSize: "0.68rem",
        lineHeight: 1,
        color: color ?? (dim ? TEXT_DIM : TEXT),
        fontWeight: bold ? 600 : 400,
        letterSpacing: bold ? 0.3 : 0,
        ...(truncate ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } : {}),
      }}
    >
      {children}
    </Typography>
  );
}

function VDiv() {
  return <Box sx={{ width: "1px", height: 26, bgcolor: DIVIDER, flexShrink: 0 }} />;
}

export default function AppStatusBar({
  currentResponseType,
  selectedEngine,
  isEngineRunning,
  llmProvider,
}: AppStatusBarProps) {
  const [counts, setCounts] = useState<DbCounts>({ puzzles: null, games: null });
  // Keyed slots: "puzzle-db", "otb-import", "agents", "engine"
  const [slots, setSlots] = useState<Map<string, BgSlot>>(new Map());
  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;

  const setSlot = (key: string, slot: BgSlot) =>
    setSlots(prev => new Map(prev).set(key, slot));

  const clearSlot = (key: string, delayMs = 2000) => {
    const existing = clearTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setSlots(prev => { const m = new Map(prev); m.delete(key); return m; });
      clearTimers.current.delete(key);
    }, delayMs);
    clearTimers.current.set(key, t);
  };

  const refresh = async () => {
    if (!electronAPI?.dbStatus) return;
    try {
      const s = await electronAPI.dbStatus();
      setCounts({ puzzles: s?.puzzles?.count ?? null, games: s?.games?.count ?? null });
    } catch {}
  };

  useEffect(() => {
    refresh();
    const unsubs: Array<() => void> = [];

    // ── Puzzle download / import ───────────────────────────────────────
    if (electronAPI?.onDbProgress) {
      unsubs.push(electronAPI.onDbProgress((data: any) => {
        const phase: string = data?.phase ?? "";
        const pct: number = data?.percent ?? 0;
        const msg: string = data?.message ?? "";
        const label =
          phase === "downloading" ? "Downloading puzzles" :
          phase === "decompressing" ? "Decompressing puzzles" :
          "Importing puzzles";
        setSlot("puzzle-db", { priority: 30, text: label, detail: msg, percent: pct, color: "#d97706" });
        if (pct >= 100) clearSlot("puzzle-db", 2500);
      }));
    }

    if (electronAPI?.onDbImportComplete) {
      unsubs.push(electronAPI.onDbImportComplete((data: any) => {
        refresh();
        if (data?.ok) {
          setSlot("puzzle-db", { priority: 30, text: "Puzzle database ready", percent: 100, color: "#16a34a" });
        }
        clearSlot("puzzle-db", 3000);
      }));
    }

    // ── OTB games import ──────────────────────────────────────────────
    if (electronAPI?.onOtbDirProgress) {
      unsubs.push(electronAPI.onOtbDirProgress((data: any) => {
        const fileIdx: number = data?.fileIndex ?? 0;
        const total: number = data?.totalFiles ?? 0;
        const phase: string = data?.phase ?? "";
        const msg: string = data?.message ?? "";
        const overallPct: number = data?.overallPercent ?? 0;
        const label =
          phase === "extracting" ? `Extracting archives (${fileIdx}/${total})` :
          phase === "importing" ? `Importing games (${fileIdx}/${total})` :
          `Processing games (${fileIdx}/${total})`;
        setSlot("otb-import", { priority: 30, text: label, detail: msg, percent: overallPct, color: "#7c3aed" });
      }));
    }

    if (electronAPI?.onOtbDirComplete) {
      unsubs.push(electronAPI.onOtbDirComplete((data: any) => {
        refresh();
        const ok = data?.ok;
        const imported: number = data?.imported ?? 0;
        const errors: number = data?.errors ?? 0;
        const text = ok
          ? `Games imported: ${imported.toLocaleString()}${errors > 0 ? ` (${errors} skipped)` : ""}`
          : "Games import finished with errors";
        setSlot("otb-import", { priority: 30, text, percent: 100, color: ok ? "#16a34a" : "#dc2626" });
        clearSlot("otb-import", 4000);
      }));
    }

    // ── Deep analysis agents ──────────────────────────────────────────
    if (electronAPI?.onAgentProgress) {
      const working = new Set<number>();
      unsubs.push(electronAPI.onAgentProgress((data: any) => {
        const { agentId, lineLabel, status } = data ?? {};
        if (status === "working") {
          working.add(agentId);
          const count = working.size;
          setSlot("agents", {
            priority: 20,
            text: count === 1 ? `Analysing ${lineLabel}…` : `Analysing ${count} lines…`,
            color: "#2563eb",
          });
        } else {
          working.delete(agentId);
          if (working.size === 0) {
            setSlot("agents", { priority: 20, text: "Analysis complete", color: "#16a34a" });
            clearSlot("agents", 3000);
          } else {
            setSlot("agents", {
              priority: 20,
              text: `Analysing ${working.size} line${working.size === 1 ? "" : "s"}…`,
              color: "#2563eb",
            });
          }
        }
      }));
    }

    // ── Engine events ──────────────────────────────────────────────────
    if (electronAPI?.onEngineWarmingUp) {
      unsubs.push(electronAPI.onEngineWarmingUp((data: any) => {
        const eng = data?.engine === "lc0" ? "LC0" : "Stockfish";
        setSlot("engine", { priority: 10, text: `${eng} warming up…`, color: "#d97706" });
      }));
    }

    if (electronAPI?.onEngineReady) {
      unsubs.push(electronAPI.onEngineReady((data: any) => {
        const eng = data?.engine?.toLowerCase() === "lc0" ? "LC0" : "Stockfish";
        setSlot("engine", { priority: 10, text: `${eng} ready`, color: "#16a34a" });
        clearSlot("engine", 2500);
      }));
    }

    if (electronAPI?.onEngineAnalysisStart) {
      unsubs.push(electronAPI.onEngineAnalysisStart((data: any) => {
        const eng = data?.engine?.toLowerCase() === "lc0" ? "LC0" : "Stockfish";
        setSlot("engine-analysis", { priority: 15, text: `${eng} analyzing…`, color: "#2563eb" });
      }));
    }

    if (electronAPI?.onEngineAnalysisDone) {
      unsubs.push(electronAPI.onEngineAnalysisDone((data: any) => {
        const eng = data?.engine?.toLowerCase() === "lc0" ? "LC0" : "Stockfish";
        setSlot("engine-analysis", { priority: 15, text: `${eng} analysis complete`, color: "#16a34a" });
        clearSlot("engine-analysis", 1500);
      }));
    }

    // ── LLM events ──────────────────────────────────────────────────────
    if (electronAPI?.onLlmGenerationStart) {
      unsubs.push(electronAPI.onLlmGenerationStart((data: any) => {
        const llmName = data?.provider === "anthropic" ? "Claude" :
                       data?.provider === "openai" ? "OpenAI" :
                       data?.provider === "gemini" ? "Gemini" :
                       data?.provider === "grok" ? "Grok" : "LLM";
        setSlot("llm", { priority: 12, text: `${llmName} generating explanation…`, color: "#7c3aed" });
      }));
    }

    if (electronAPI?.onLlmGenerationDone) {
      unsubs.push(electronAPI.onLlmGenerationDone((data: any) => {
        const llmName = data?.provider === "anthropic" ? "Claude" :
                       data?.provider === "openai" ? "OpenAI" :
                       data?.provider === "gemini" ? "Gemini" :
                       data?.provider === "grok" ? "Grok" : "LLM";
        setSlot("llm", { priority: 12, text: `${llmName} ready`, color: "#16a34a" });
        clearSlot("llm", 1500);
      }));
    }

    if (electronAPI?.onDbRefreshStatus) unsubs.push(electronAPI.onDbRefreshStatus(refresh));

    return () => {
      unsubs.forEach(u => u());
      clearTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Pick the highest-priority slot to display
  const activeSlot: BgSlot | null = slots.size === 0 ? null :
    [...slots.values()].reduce((best, s) => s.priority > best.priority ? s : best);

  const engineLabel = selectedEngine === "lc0" ? "LC0" : "Stockfish";
  const modeLabel = MODE_LABELS[currentResponseType] ?? "Analysis";
  const modeColor = MODE_COLORS[currentResponseType] ?? "#2563eb";

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: 26,
        width: "100%",
        position: "relative",
        bgcolor: BAR_BG,
        borderTop: `1px solid ${DIVIDER}`,
        display: "flex",
        alignItems: "center",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Progress bar — 2px line at very top, spans full bar width */}
      {activeSlot?.percent !== undefined && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 2,
            width: `${Math.min(100, activeSlot.percent)}%`,
            bgcolor: activeSlot.color ?? modeColor,
            transition: "width 0.4s ease",
            zIndex: 1,
          }}
        />
      )}

      {/* ── Left: mode + engine + LLM ─────────────────────────────── */}
      <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
        {/* Mode pill */}
        <Box
          sx={{
            px: 1.25,
            height: 26,
            display: "flex",
            alignItems: "center",
            bgcolor: modeColor,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: "0.67rem", fontWeight: 700, lineHeight: 1, letterSpacing: 0.4, color: "#fff" }}>
            {modeLabel.toUpperCase()}
          </Typography>
        </Box>

        <VDiv />
        <Box sx={{ px: 1.25, height: 26, display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: isEngineRunning ? "#16a34a" : "rgba(0,0,0,0.18)", flexShrink: 0 }} />
          <Txt>{engineLabel}</Txt>
        </Box>

        <VDiv />
        <Box sx={{ px: 1.25, height: 26, display: "flex", alignItems: "center" }}>
          <Txt dim>{llmProvider}</Txt>
        </Box>
      </Stack>

      <VDiv />

      {/* ── Centre: background process messages ───────────────────── */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: 26,
          display: "flex",
          alignItems: "center",
          px: 1.5,
          gap: 0.75,
          overflow: "hidden",
        }}
      >
        {activeSlot ? (
          <>
            <Txt bold color={activeSlot.color}>{activeSlot.text}</Txt>
            {activeSlot.percent !== undefined && (
              <>
                <Txt dim>·</Txt>
                <Txt>{activeSlot.percent}%</Txt>
              </>
            )}
            {activeSlot.detail && (
              <>
                <Txt dim>·</Txt>
                <Txt dim truncate>{activeSlot.detail}</Txt>
              </>
            )}
          </>
        ) : (
          <Txt dim>Ready</Txt>
        )}
      </Box>

      <VDiv />

      {/* ── Right: DB counts + credits ─────────────────────────────── */}
      <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
        {counts.puzzles !== null && (
          <>
            <Tooltip title="Puzzle database (Lichess)" placement="top">
              <Box sx={{ px: 1.25, height: 26, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.65rem", lineHeight: 1 }}>🧩</Typography>
                <Txt>{fmtCount(counts.puzzles)} puzzles</Txt>
              </Box>
            </Tooltip>
            <VDiv />
          </>
        )}

        {counts.games !== null && (
          <>
            <Tooltip title="Games database (Lumbrasgigabase)" placement="top">
              <Box sx={{ px: 1.25, height: 26, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.65rem", lineHeight: 1 }}>♜</Typography>
                <Txt>{fmtCount(counts.games)} games</Txt>
              </Box>
            </Tooltip>
            <VDiv />
          </>
        )}

        <Box sx={{ px: 1.25, height: 26, display: "flex", alignItems: "center", gap: 0.5 }}>
          <Txt dim>Puzzles:</Txt>
          <Typography
            component="span"
            onClick={() => electronAPI?.openExternalUrl?.("https://lichess.org/training")}
            sx={{ fontSize: "0.65rem", color: TEXT_DIM, lineHeight: 1, cursor: "pointer", textDecoration: "underline", "&:hover": { color: TEXT } }}
          >
            Lichess
          </Typography>
          <Txt dim>·</Txt>
          <Txt dim>Games:</Txt>
          <Typography
            component="span"
            onClick={() => electronAPI?.openExternalUrl?.("https://lumbrasgigabase.com/")}
            sx={{ fontSize: "0.65rem", color: TEXT_DIM, lineHeight: 1, cursor: "pointer", textDecoration: "underline", "&:hover": { color: TEXT } }}
          >
            Lumbrasgigabase
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
