import { Paper, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { ElectronAPI } from "../types";

interface PositionNotesPanelProps {
  currentFen: string;
  electronAPI: ElectronAPI | null;
  onNoteChange: (fen: string, text: string) => void;
}

const DEBOUNCE_MS = 500;

export default function PositionNotesPanel({ currentFen, electronAPI, onNoteChange }: PositionNotesPanelProps) {
  const [text, setText] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activefen = useRef<string>(currentFen);

  // Load note whenever FEN changes
  useEffect(() => {
    activefen.current = currentFen;
    setText("");
    if (!electronAPI?.notesGet || !currentFen) return;
    electronAPI.notesGet(currentFen).then((saved) => {
      if (activefen.current === currentFen) {
        setText(saved ?? "");
      }
    }).catch(() => {});
  }, [currentFen, electronAPI]);

  function handleChange(value: string) {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onNoteChange(currentFen, value);
      electronAPI?.notesSet(currentFen, value).catch(() => {});
    }, DEBOUNCE_MS);
  }

  const fenLabel = currentFen ? currentFen.slice(0, 20) + (currentFen.length > 20 ? "…" : "") : "";

  return (
    <Paper
      elevation={2}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 2,
        minWidth: 280,
        maxWidth: 320
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
        Position Notes
      </Typography>
      {fenLabel && (
        <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, fontFamily: "monospace", display: "block" }}>
          {fenLabel}
        </Typography>
      )}
      <TextField
        multiline
        fullWidth
        placeholder="Type your notes for this position…"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        sx={{ flex: 1 }}
        slotProps={{
          input: {
            sx: { height: "100%", alignItems: "flex-start" }
          }
        }}
      />
    </Paper>
  );
}
