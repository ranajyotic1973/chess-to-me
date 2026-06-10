import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";
import type { ChatPanelProps } from "../types";

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

export default function ChatPanel({
  questionText,
  onQuestionChange,
  onAskQuestion,
  questionLoading,
  questionResponse,
  onClearQuestion,
  onOpenSettings,
  analysisStatus,
  onMoveSuggested,
  llmProvider = "LLM",
  analysisLines = [],
  onSelectEngineLine,
  selectedEngineLineIndex = null,
  currentMoveIndex = 0,
  responseType,
  responseData = {},
  showSolution = false,
  onShowSolution,
  agentStatuses = [],
  isExplanationLoading = false,
  puzzleNavigationMode = false,
  sx
}: ChatPanelProps) {
  const [showInlineLines, setShowInlineLines] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (analysisLines.length > 0) {
      setShowInlineLines(true);
    }
  }, [analysisLines]);

  // Re-expand lines list if line is deselected
  useEffect(() => {
    if (selectedEngineLineIndex === null) {
      setShowInlineLines(analysisLines.length > 0);
    }
  }, [selectedEngineLineIndex, analysisLines.length]);

  const paperSx = Array.isArray(sx) ? sx : sx ? [sx] : [];
  const providerName = llmProvider
    ? llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)
    : "LLM";

  const detectedMoves = detectMovesInResponse(questionResponse);
  const showLineList = analysisLines.length > 0 &&
    (responseType === "Analysis" || responseType === "Position") &&
    showInlineLines;
  const selectedLine = selectedEngineLineIndex !== null ? analysisLines[selectedEngineLineIndex] : null;
  const selectedLineNum = selectedLine ? (selectedLine.rank || (selectedEngineLineIndex ?? 0) + 1) : null;

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
          {/* Inline Engine Analysis Lines */}
          {showLineList && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.main" }}>
                Engine Analysis (Top Lines)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Click a line or type its number (1–{analysisLines.length}) to select
              </Typography>
              {analysisLines.map((line, idx) => {
                const lineNum = line.rank || idx + 1;
                const pv = line.pv || line.line || "";
                const isSelected = selectedEngineLineIndex === idx;
                return (
                  <Box
                    key={`line-${idx}`}
                    onClick={() => {
                      onSelectEngineLine?.(idx, line);
                      setShowInlineLines(false);
                    }}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: isSelected ? "primary.light" : "action.hover",
                      cursor: "pointer",
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "transparent",
                      "&:hover": {
                        backgroundColor: isSelected ? "primary.light" : "action.selected"
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: isSelected ? 700 : 400 }}>
                      <strong>Line {lineNum}:</strong> {pv || "(no moves)"}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Selected line summary (collapsed state) */}
          {!showInlineLines && selectedLineNum !== null && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`Line ${selectedLineNum} selected`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowInlineLines(true)}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  Change line
                </Button>
              </Stack>
              <Typography variant="caption" sx={{ color: "info.main", fontStyle: "italic" }}>
                Line {selectedLineNum} selected. Use → to advance moves, ← to go back.
                {" "}Move {currentMoveIndex + 1} of {(selectedLine?.pv || selectedLine?.line || "").split(/\s+/).filter((m) => m.trim()).length || "?"}
              </Typography>
            </Box>
          )}

          {/* Puzzle navigation instruction */}
          {puzzleNavigationMode && (
            <Box sx={{ p: 1.5, backgroundColor: "warning.lighter", borderRadius: 1, border: 1, borderColor: "warning.light" }}>
              <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>
                Solution loaded. Use → to step through each move, ← to go back.
              </Typography>
            </Box>
          )}

          {/* Main conversation content */}
          {!questionResponse && !questionLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ color: "#999" }}>
              Ask a question to see the response here...
            </Typography>
          ) : (
            <>
              {questionText && (
                <Box>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
                    Your question:
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: "italic", color: "#555" }}>
                    {questionText}
                  </Typography>
                </Box>
              )}

              {/* Response type badge */}
              {responseType && responseType !== "Analysis" && (
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
              {questionLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    Waiting for response...
                  </Typography>
                </Box>
              ) : (
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

                  {/* Hidden solution reveal button for puzzles */}
                  {responseType === "Puzzle" && responseData?.hidden_solution && !showSolution && (
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

                  {/* Show explanation only if not hidden or if revealed */}
                  {(!responseData?.hidden_solution || showSolution) && (
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
              )}
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
