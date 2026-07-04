import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Box,
  ToggleButton,
  Divider
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import TitleIcon from "@mui/icons-material/Title";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import LinkIcon from "@mui/icons-material/Link";
import CodeIcon from "@mui/icons-material/Code";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface NoteEditorPopupProps {
  open: boolean;
  /** Initial markdown content shown in the editor. */
  initialContent: string;
  /** When true, place the cursor at the very start (used for AI-imported notes). */
  cursorAtStart?: boolean;
  onSave: (markdown: string) => void;
  onCancel: () => void;
}

type WrapFormat = { type: "wrap"; before: string; after: string; placeholder: string };
type LineFormat = { type: "line"; prefix: string };
type Format = WrapFormat | LineFormat;

/**
 * Popup B — a markdown note editor with an RTF-style formatting toolbar.
 * Notes are authored and stored as plain markdown; a live preview renders
 * the markdown so users see the formatted result.
 */
export default function NoteEditorPopup({
  open,
  initialContent,
  cursorAtStart = false,
  onSave,
  onCancel
}: NoteEditorPopupProps) {
  const [value, setValue] = useState<string>(initialContent);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset editor content each time the popup opens for a (possibly) different move.
  useEffect(() => {
    if (open) {
      setValue(initialContent);
      setShowPreview(false);
    }
  }, [open, initialContent]);

  // Focus the editor and place the cursor once the dialog has rendered.
  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      el.focus();
      const pos = cursorAtStart ? 0 : el.value.length;
      el.setSelectionRange(pos, pos);
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, cursorAtStart]);

  const applyFormat = (format: Format) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let nextValue: string;
    let nextStart: number;
    let nextEnd: number;

    if (format.type === "wrap") {
      const inner = selected || format.placeholder;
      nextValue = value.slice(0, start) + format.before + inner + format.after + value.slice(end);
      nextStart = start + format.before.length;
      nextEnd = nextStart + inner.length;
    } else {
      // Line format: prefix the start of the line containing the selection start.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      nextValue = value.slice(0, lineStart) + format.prefix + value.slice(lineStart);
      nextStart = start + format.prefix.length;
      nextEnd = end + format.prefix.length;
    }

    setValue(nextValue);
    // Restore focus + selection after React re-renders.
    window.setTimeout(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(nextStart, nextEnd);
    }, 0);
  };

  const toolbarButtons: Array<{ title: string; icon: ReactNode; format: Format }> = [
    { title: "Bold", icon: <FormatBoldIcon fontSize="small" />, format: { type: "wrap", before: "**", after: "**", placeholder: "bold" } },
    { title: "Italic", icon: <FormatItalicIcon fontSize="small" />, format: { type: "wrap", before: "*", after: "*", placeholder: "italic" } },
    { title: "Heading", icon: <TitleIcon fontSize="small" />, format: { type: "line", prefix: "## " } },
    { title: "Bulleted list", icon: <FormatListBulletedIcon fontSize="small" />, format: { type: "line", prefix: "- " } },
    { title: "Link", icon: <LinkIcon fontSize="small" />, format: { type: "wrap", before: "[", after: "](url)", placeholder: "text" } },
    { title: "Inline code", icon: <CodeIcon fontSize="small" />, format: { type: "wrap", before: "`", after: "`", placeholder: "code" } },
    { title: "Blockquote", icon: <FormatQuoteIcon fontSize="small" />, format: { type: "line", prefix: "> " } }
  ];

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Move notes</DialogTitle>
      <DialogContent dividers>
        {/* Formatting toolbar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
          {toolbarButtons.map((btn) => (
            <Tooltip key={btn.title} title={btn.title}>
              <IconButton size="small" onClick={() => applyFormat(btn.format)} aria-label={btn.title.toLowerCase()}>
                {btn.icon}
              </IconButton>
            </Tooltip>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title={showPreview ? "Hide preview" : "Show preview"}>
            <ToggleButton
              value="preview"
              selected={showPreview}
              size="small"
              onChange={() => setShowPreview((p) => !p)}
              sx={{ border: "none", p: 0.5 }}
              aria-label="toggle preview"
            >
              <VisibilityIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </Box>

        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write your notes in markdown…"
          style={{
            width: "100%",
            minHeight: 220,
            resize: "vertical",
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: "0.85rem",
            lineHeight: 1.5,
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: 4,
            boxSizing: "border-box",
            outline: "none"
          }}
        />

        {/* Live markdown preview */}
        {showPreview && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              backgroundColor: "#f9f9f9",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#333",
              "& p": { margin: "0.5rem 0" },
              "& ul, & ol": { marginLeft: "1.5rem", margin: "0.5rem 0" },
              "& code": { backgroundColor: "#e8e8e8", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace" },
              "& blockquote": { borderLeft: "3px solid #ddd", marginLeft: 0, paddingLeft: "12px", color: "#666" }
            }}
          >
            <ReactMarkdown>{value || "_Nothing to preview yet._"}</ReactMarkdown>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Tooltip title="Cancel">
          <IconButton onClick={onCancel} color="inherit" aria-label="cancel note">
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Save">
          <IconButton onClick={() => onSave(value)} color="primary" aria-label="save note">
            <SaveIcon />
          </IconButton>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
