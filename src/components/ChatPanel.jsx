import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloseIcon from "@mui/icons-material/Close";
import { useCallback, useEffect, useMemo, useState } from "react";

const sanitizeHtml = (html) => {
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

const formatMoves = (pv) => {
  if (!pv) return "";
  const tokens = pv.split(/\s+/).filter(Boolean);
  const pairs = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const white = tokens[i];
    const black = tokens[i + 1];
    const pair = white + (black ? ` ${black}` : "");
    pairs.push(pair);
  }
  return pairs.join(", ");
};

export default function ChatPanel({
  questionText,
  onQuestionChange,
  onAskQuestion,
  questionLoading,
  questionResponse,
  onClearQuestion,
  onOpenSettings,
  analysisLines = [],
  analysisStatus,
  analysisLoading,
  sx
}) {
  const paperSx = Array.isArray(sx) ? sx : sx ? [sx] : [];
  const responseHtml = sanitizeHtml(questionResponse);
  const [selectedLine, setSelectedLine] = useState(null);

  const analysisRows = useMemo(
    () =>
      analysisLines.map((line) => ({
        rank: line.rank,
        description: formatMoves(line.pv)
      })),
    [analysisLines]
  );

  const closeDialog = useCallback(() => setSelectedLine(null), []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeDialog]);
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
      <Stack spacing={2} sx={{ flex: 1, overflow: "hidden", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            Ask a strategic question
          </Typography>
          <IconButton size="small" onClick={onOpenSettings} aria-label="open settings">
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            sx={{
              flex: "8 0 0",
              minHeight: 0,
              overflow: "hidden",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2">Analysis</Typography>
              {analysisLoading && <CircularProgress size={16} />}
            </Stack>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
              <Stack spacing={1}>
                {analysisRows.map((row) => (
                  <Box
                    key={`analysis-${row.rank}`}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      border: 1,
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 1
                    }}
                  >
                    <IconButton
                      size="small"
                      aria-label={`Play line ${row.rank}`}
                      onClick={() => setSelectedLine(row)}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {row.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            {questionResponse && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                borderTop: 1,
                borderColor: "divider",
                pt: 1
              }}
            >
                <Typography variant="subtitle2">LLM answer</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                  sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: responseHtml }}
                />
              </Box>
            )}
          </Box>
          <Box sx={{ flex: "2 0 0", minHeight: 0 }}>
            <TextField
              multiline
              minRows={3}
              maxRows={6}
              placeholder="e.g. What plans should White consider here?"
              value={questionText}
              onChange={(event) => onQuestionChange(event.target.value)}
              fullWidth
              sx={{ height: "100%" }}
            />
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onAskQuestion} disabled={questionLoading}>
            Ask LLM
          </Button>
          <Button variant="outlined" onClick={onClearQuestion}>
            Clear
          </Button>
        </Stack>
      </Stack>
      {selectedLine && (
        <Box
          onClick={closeDialog}
          sx={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            p: 2
          }}
        >
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{
              width: "min(600px, 90vw)",
              backgroundColor: "background.paper",
              borderRadius: 3,
              boxShadow: 24,
              p: 3,
              position: "relative"
            }}
          >
            <IconButton
              size="small"
              onClick={closeDialog}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography variant="h6">Line {selectedLine.rank}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedLine.description}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
