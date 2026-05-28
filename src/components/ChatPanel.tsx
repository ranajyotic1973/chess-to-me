import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Modal,
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
import { useState, useEffect } from "react";
import type { ChatPanelProps } from "../types";

interface DetectedMove {
  from: string;
  to: string;
  analysis?: string;
}

const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) {
    return "";
  }
  if (typeof window === "undefined") {
    return html;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script,style").forEach((el) => el.remove());
  return doc.body.innerHTML;
};

const detectMovesInResponse = (response: string): DetectedMove[] => {
  const moves: DetectedMove[] = [];
  if (!response) return moves;

  // Pattern: [MOVE: from-to] or similar notation
  // Look for patterns like "e2-e4" or "e2 to e4" within the response
  const movePattern = /(?:move[s]?:|suggest[s]?:|playing?:)\s*([a-h][1-8])\s*(?:to|-|→)\s*([a-h][1-8])/gi;
  let match;

  while ((match = movePattern.exec(response)) !== null) {
    moves.push({
      from: match[1].toLowerCase(),
      to: match[2].toLowerCase()
    });
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
  analysisEntries = [],
  analysisStatus,
  analysisLoading,
  onPlayLine,
  selectedAnalysisId,
  onLineSelect,
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
  sx
}: ChatPanelProps) {
  const [showEngineLines, setShowEngineLines] = useState(false);
  const [prevSelectedIndex, setPrevSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (analysisLines.length > 0) {
      setShowEngineLines(true);
    }
  }, [analysisLines]);

  useEffect(() => {
    // Close modal when a line is selected (either by click or auto-detection)
    if (selectedEngineLineIndex !== null && selectedEngineLineIndex !== prevSelectedIndex) {
      setPrevSelectedIndex(selectedEngineLineIndex);
      setShowEngineLines(false);
    }
  }, [selectedEngineLineIndex, prevSelectedIndex]);

  const paperSx = Array.isArray(sx) ? sx : sx ? [sx] : [];
  const providerName = llmProvider
    ? llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)
    : "LLM";

  const detectedMoves = detectMovesInResponse(questionResponse);

  const handleEngineLineSelected = () => {
    setShowEngineLines(false);
  };

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
          {/* Engine Lines Modal */}
          <Modal
            open={analysisLines.length > 0 && showEngineLines}
            onClose={() => setShowEngineLines(false)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Box
              sx={{
                backgroundColor: "background.paper",
                borderRadius: 2,
                boxShadow: 24,
                p: 3,
                maxHeight: "50%",
                width: "90%",
                maxWidth: 500,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1.5
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  Engine Analysis (Top Lines)
                </Typography>
                {selectedEngineLineIndex !== null && analysisLines[selectedEngineLineIndex] && (
                  <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
                    Line {(analysisLines[selectedEngineLineIndex]?.rank || selectedEngineLineIndex + 1)} selected
                  </Typography>
                )}
              </Box>

              {selectedEngineLineIndex !== null && analysisLines[selectedEngineLineIndex] && (
                <Box sx={{ backgroundColor: "action.hover", p: 1.5, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    Move {currentMoveIndex + 1} of {(analysisLines[selectedEngineLineIndex]?.pv || analysisLines[selectedEngineLineIndex]?.line || "").split(/\s+/).filter((m) => m.trim()).length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "info.main", fontStyle: "italic" }}>
                    ⌨️ Use arrow keys to navigate | Click a line or type its number to select
                  </Typography>
                </Box>
              )}

              {analysisLines.map((line, idx) => {
                const lineNum = line.rank || idx + 1;
                const pv = line.pv || line.line || "";
                const isSelected = selectedEngineLineIndex === idx;
                return (
                  <Box
                    key={`line-${idx}`}
                    onClick={() => {
                      onSelectEngineLine?.(idx, line);
                      handleEngineLineSelected();
                    }}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: isSelected ? "primary.light" : "action.hover",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "transparent",
                      fontWeight: isSelected ? 700 : 400,
                      "&:hover": {
                        backgroundColor: isSelected ? "primary.light" : "action.selected"
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                      <strong>Line {lineNum}:</strong> {pv || "(no moves)"}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Modal>

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

              {/* Agent Status Cards - show while agents are working */}
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
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAskQuestion();
                onClearQuestion();
              }
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
            disabled={questionLoading}
          >
            Ask {providerName}
          </Button>
          <Tooltip title="Clear">
            <IconButton
              size="small"
              onClick={onClearQuestion}
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
