import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ClearIcon from "@mui/icons-material/Clear";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReactMarkdown from "react-markdown";
import { useRef, useState, useEffect } from "react";
import type { ChatPanelProps, DeepLineAnalysis } from "../types";
import SelectableList from "./SelectableList";
import type { SelectableListItem } from "./SelectableList";

interface DetectedMove {
  from: string;
  to: string;
  analysis?: string;
}

const detectMovesInResponse = (response: string): DetectedMove[] => {
  const moves: DetectedMove[] = [];
  if (!response) return moves;

  const movePattern = /(?:move[s]?:|suggest[s]?:|playing?:)\s*([a-h][1-8])\s*(?:to|-|→)\s*([a-h][1-8])/gi;
  let match;
  while ((match = movePattern.exec(response)) !== null) {
    moves.push({ from: match[1].toLowerCase(), to: match[2].toLowerCase() });
  }
  return moves;
};

const DEEP_ANALYSIS_FIELDS: Array<{ key: keyof DeepLineAnalysis; label: string }> = [
  { key: "strategy",       label: "Strategy" },
  { key: "proscons",       label: "Pros & Cons" },
  { key: "counterattack",  label: "Counter-attack" },
  { key: "sacrifice",      label: "Sacrifice" },
  { key: "novelty",        label: "Novelty" },
  { key: "endgameChances", label: "Endgame chances" },
  { key: "alternatives",   label: "Alternatives" }
];

export default function ChatPanel({
  questionText,
  onQuestionChange,
  onAskQuestion,
  questionLoading,
  questionResponse,
  onClearQuestion,
  onOpenSettings,
  analysisStatus,
  analysisEntries = [],
  onMoveSuggested,
  llmProvider = "LLM",
  analysisLines = [],
  onSelectEngineLine,
  onDeselectLine,
  selectedEngineLineIndex = null,
  currentMoveIndex = 0,
  responseType,
  responseData = {},
  showSolution = false,
  onShowSolution,
  puzzleIncorrect = false,
  onRetryPuzzle,
  agentStatuses = [],
  isExplanationLoading = false,
  puzzleNavigationMode = false,
  gameList,
  onGameSelect,
  onBackToGameList,
  advancedAnalysisMode = false,
  deepAnalysisResults = {},
  deepAnalysisLoading = false,
  sx
}: ChatPanelProps) {
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedGameItemId, setSelectedGameItemId] = useState<string | null>(null);

  // Clear selection when the game list disappears entirely
  useEffect(() => {
    if (!gameList || gameList.length === 0) setSelectedGameItemId(null);
  }, [gameList]);

  const paperSx = Array.isArray(sx) ? sx : sx ? [sx] : [];
  const providerName = llmProvider
    ? llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)
    : "LLM";

  const detectedMoves = detectMovesInResponse(questionResponse);

  const showAnalysisLines = analysisLines.length > 0 &&
    (responseType === "Analysis" || responseType === "Position" || responseType === "Game");

  const selectedLine = selectedEngineLineIndex !== null ? analysisLines[selectedEngineLineIndex] : null;
  const selectedLineNum = selectedLine ? (selectedLine.rank || (selectedEngineLineIndex ?? 0) + 1) : null;

  const analysisListItems: SelectableListItem[] = showAnalysisLines
    ? analysisLines.map((line, idx) => {
        const lineNum = line.rank || idx + 1;
        const entry = analysisEntries[idx];
        return {
          id: `line-${idx}`,
          label: `Line ${lineNum}`,
          sublabel: entry?.description || line.pv || line.line || "(no moves)",
        };
      })
    : [];

  const analysisSelectedId = selectedEngineLineIndex !== null ? `line-${selectedEngineLineIndex}` : null;

  return (
    <Paper
      elevation={3}
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          p: 3
        },
        ...paperSx
      ]}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexShrink: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            Ask a strategic question
          </Typography>
          <IconButton size="small" onClick={onOpenSettings} aria-label="open settings">
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Error Status */}
        {analysisStatus && (
          <Typography variant="body2" color="error" sx={{ fontWeight: 500, mb: 1, flexShrink: 0 }}>
            {analysisStatus}
          </Typography>
        )}

        {/* Conversation Area - Scrollable */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            overflowY: "auto",
            overflowX: "hidden",
            mb: 2
          }}
        >
          {/* Analysis lines — list or detail view via SelectableList */}
          {showAnalysisLines && (
            <SelectableList
              items={analysisListItems}
              title="Engine Analysis (Top Lines)"
              hint={`Click a line or type its number (1–${analysisLines.length}) to select`}
              selectedId={analysisSelectedId}
              onSelect={(_id, idx) => onSelectEngineLine?.(idx, analysisLines[idx])}
              onBack={() => onDeselectLine?.()}
            >
              {/* Detail content: shown when a line is selected */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip
                  label={`Line ${selectedLineNum} selected`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Typography variant="caption" sx={{ color: "info.main", fontStyle: "italic" }}>
                Line {selectedLineNum} selected. Use → to advance moves, ← to go back.
                {" "}Move {currentMoveIndex + 1} of{" "}
                {selectedEngineLineIndex !== null
                  ? (analysisEntries[selectedEngineLineIndex]?.moves?.length ??
                      (selectedLine?.pv || "").split(/\s+/).filter(Boolean).length)
                  : "?"}
              </Typography>

              {/* Deep analysis fields */}
              {advancedAnalysisMode && selectedEngineLineIndex !== null && (
                deepAnalysisLoading && deepAnalysisResults[selectedEngineLineIndex] === undefined
                  ? (
                    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {DEEP_ANALYSIS_FIELDS.map((f) => (
                        <Box key={f.key}>
                          <Skeleton variant="text" width="30%" sx={{ mb: 0.25 }} />
                          <Skeleton variant="rectangular" height={40} />
                        </Box>
                      ))}
                    </Box>
                  )
                  : deepAnalysisResults[selectedEngineLineIndex]
                    ? (
                      <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
                        {DEEP_ANALYSIS_FIELDS.map((f) => (
                          <Box key={f.key}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", display: "block" }}>
                              {f.label}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              {deepAnalysisResults[selectedEngineLineIndex]![f.key]}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )
                    : null
              )}
            </SelectableList>
          )}

          {/* Puzzle navigation instruction */}
          {puzzleNavigationMode && (
            <Box sx={{ p: 1.5, backgroundColor: "warning.lighter", borderRadius: 1, border: 1, borderColor: "warning.light" }}>
              <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>
                Solution loaded. Use → to step through each move, ← to go back.
              </Typography>
            </Box>
          )}

          {/* Game list — shown whenever data exists; clears only when App sets gameList=null */}
          {gameList && gameList.length > 0 && (
            <SelectableList
              items={gameList.map((game, idx) => ({
                id: String(idx),
                label: `${game.white} vs ${game.black}`,
                sublabel: [game.event, game.date, game.opening || game.eco]
                  .filter(Boolean).join(" · "),
                badge: (
                  <Chip
                    label={game.result}
                    size="small"
                    variant="filled"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor:
                        game.result === "1-0" ? "#16a34a" :
                        game.result === "0-1" ? "#dc2626" : "#6b7280",
                      color: "#fff",
                    }}
                  />
                ),
              }))}
              hint={`${gameList.length} game${gameList.length === 1 ? "" : "s"} — click any to load on the board`}
              selectedId={selectedGameItemId}
              onSelect={(id, idx) => { setSelectedGameItemId(id); onGameSelect?.(idx); }}
              onBack={() => { setSelectedGameItemId(null); onBackToGameList?.(); }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                Game loaded on the board — use ← → to navigate moves.
              </Typography>
            </SelectableList>
          )}

          {/* Loading state — clears all stale content while a new response arrives */}
          {questionLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Waiting for response...
              </Typography>
            </Box>
          )}

          {/* Empty state — only when not loading, no response, and no active game list */}
          {!questionLoading && !questionResponse && !(gameList && gameList.length > 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ color: "#999" }}>
              Ask a question to see the response here...
            </Typography>
          )}

          {/* Response content — only shown when not loading and there is a response */}
          {!questionLoading && questionResponse && (
            <>
              {/* Response type badge */}
              {responseType && responseType !== "Analysis" && responseType !== "GameList" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                    Response Type:
                  </Typography>
                  <Chip
                    label={responseType}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 24 }}
                  />
                </Box>
              )}

              {/* Agent Status Cards */}
              {agentStatuses.length > 0 && agentStatuses.some((a) => a.status === "working") && (
                <Box sx={{ p: 1.5, backgroundColor: "info.lighter", borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" color="info.main" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                    Analyzing variations...
                  </Typography>
                  <Stack spacing={0.5}>
                    {agentStatuses.map((agent) => (
                      <Stack
                        key={agent.agentId}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ p: 0.75, backgroundColor: "background.paper", borderRadius: 0.5 }}
                      >
                        {agent.status === "working" && <CircularProgress size={14} />}
                        {agent.status === "done" && (
                          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "success.main" }} />
                        )}
                        {agent.status === "error" && (
                          <ErrorOutlineIcon sx={{ fontSize: 16, color: "error.main" }} />
                        )}
                        <Typography variant="caption" sx={{ flex: 1 }}>
                          Agent {agent.agentId}: {agent.lineLabel}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              <Typography variant="subtitle2">{providerName} response:</Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {detectedMoves.length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {detectedMoves.map((move, idx) => (
                      <Chip
                        key={`move-${idx}`}
                        label={`${move.from}→${move.to}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        onClick={() => onMoveSuggested?.(move.from, move.to)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Box>
                )}

                {/* Side-to-move badge for puzzles */}
                {responseType === "Puzzle" && responseData?.side_to_move && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Chip
                      label={`${responseData.side_to_move} to move`}
                      size="small"
                      color={responseData.side_to_move === "White" ? "default" : "primary"}
                      variant="filled"
                      sx={{
                        fontWeight: 700,
                        backgroundColor: responseData.side_to_move === "White" ? "#f5f5f5" : "#1a1a2e",
                        color: responseData.side_to_move === "White" ? "#333" : "#fff",
                        border: "1px solid",
                        borderColor: responseData.side_to_move === "White" ? "#ccc" : "#1a1a2e"
                      }}
                    />
                  </Box>
                )}

                {/* Incorrect attempt: retry + reveal buttons */}
                {responseType === "Puzzle" && puzzleIncorrect && (
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", py: 1 }}>
                    <Tooltip title="Retry puzzle from the start">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={onRetryPuzzle}
                        aria-label="retry puzzle"
                      >
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {responseData?.hidden_solution && !showSolution && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        onClick={onShowSolution}
                        sx={{ textTransform: "none" }}
                      >
                        Reveal Solution
                      </Button>
                    )}
                  </Box>
                )}

                {/* Hidden solution reveal button (no incorrect attempt yet) */}
                {responseType === "Puzzle" && responseData?.hidden_solution && !showSolution && !puzzleIncorrect && (
                  <Box sx={{ py: 2, textAlign: "center" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onShowSolution}
                      sx={{ textTransform: "none" }}
                    >
                      Reveal Solution
                    </Button>
                  </Box>
                )}

                {/* SAN solution move list (shown after reveal) */}
                {responseType === "Puzzle" && showSolution && Array.isArray(responseData?.solution_san) && responseData.solution_san.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      Solution:
                    </Typography>
                    {(responseData.solution_san as string[]).map((san: string, idx: number) => (
                      <Chip
                        key={idx}
                        label={`${idx + 1}. ${san}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                      />
                    ))}
                  </Box>
                )}

                {/* Markdown response — hidden for puzzle with unrevealed solution or when game list handles display */}
                {responseType !== "GameList" && (!responseData?.hidden_solution || showSolution) && (
                  <Box
                    sx={{
                      color: "#333",
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                      "& p": { margin: "0.5rem 0" },
                      "& ul, & ol": { marginLeft: "1.5rem", margin: "0.5rem 0" },
                      "& li": { marginBottom: "0.25rem" },
                      "& code": { backgroundColor: "#f5f5f5", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace" },
                      "& pre": { backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px", overflowX: "auto", fontSize: "0.8rem" },
                      "& blockquote": { borderLeft: "3px solid #ddd", marginLeft: "0", paddingLeft: "12px", color: "#666" }
                    }}
                  >
                    <ReactMarkdown>{questionResponse}</ReactMarkdown>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Text Input */}
        <Box sx={{ flexShrink: 0, mb: 2 }}>
          <TextField
            multiline
            minRows={3}
            maxRows={5}
            placeholder="e.g. What plans should White consider here?"
            value={questionText}
            onChange={(event) => onQuestionChange(event.target.value)}
            disabled={isExplanationLoading}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAskQuestion();
                onClearQuestion();
              }
              // Allow Left/Right to move cursor in textarea naturally — do NOT call event.stopPropagation()
              // The global keyboard handler guards against textarea focus via document.activeElement check
            }}
            inputRef={(el) => {
              chatInputRef.current = el;
            }}
            fullWidth
          />
        </Box>

        {/* Buttons */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={() => {
              onAskQuestion();
              onClearQuestion();
            }}
            disabled={questionLoading || isExplanationLoading}
          >
            Ask {providerName}
          </Button>
          <Tooltip title="Clear">
            <IconButton
              size="small"
              onClick={onClearQuestion}
              disabled={isExplanationLoading}
              aria-label="clear chat"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  );
}
