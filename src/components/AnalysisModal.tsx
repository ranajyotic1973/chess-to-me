import { Box, IconButton, Typography, Paper } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  moves: string[];
  analysis: string;
}

export default function AnalysisModal({ isOpen, onClose, moves, analysis }: AnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
      }}
      onClick={onClose}
    >
      <Paper
        sx={{
          width: "90%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            Position Analysis
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="close modal">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Moves Played Section */}
        {moves.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>
              Moves Played
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", p: 1.5, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              {moves.join(" ")}
            </Typography>
          </Box>
        )}

        {/* Analysis Section */}
        {analysis && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: "#f9f9f9",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#333",
              flex: 1,
              overflowY: "auto",
              "& p": { margin: "0.5rem 0" },
              "& ul, & ol": { marginLeft: "1.5rem", margin: "0.5rem 0" },
              "& li": { marginBottom: "0.25rem" },
              "& strong": { fontWeight: 700 },
              "& em": { fontStyle: "italic" },
              "& code": { backgroundColor: "#e8e8e8", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace" },
            }}
          >
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
