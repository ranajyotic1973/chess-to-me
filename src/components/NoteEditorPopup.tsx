import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Box,
  Divider,
  Menu,
  MenuItem
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import TitleIcon from "@mui/icons-material/Title";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import LinkIcon from "@mui/icons-material/Link";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { markdownToHtml, htmlToMarkdown } from "../utils/markdownHtml";

interface NoteEditorPopupProps {
  open: boolean;
  /** Initial markdown content shown in the editor. */
  initialContent: string;
  /** When true, place the cursor at the very start (used for AI-imported notes). */
  cursorAtStart?: boolean;
  onSave: (markdown: string) => void;
  onCancel: () => void;
}

/**
 * Popup B — an inline WYSIWYG note editor. The editing surface is a
 * contentEditable region that renders formatted text directly (headings, bold,
 * lists, quotes, links). Content is seeded from markdown and serialised back to
 * markdown on save, so notes are always stored and exported as markdown.
 */
export default function NoteEditorPopup({
  open,
  initialContent,
  cursorAtStart = false,
  onSave,
  onCancel
}: NoteEditorPopupProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [headingAnchor, setHeadingAnchor] = useState<HTMLElement | null>(null);
  // Bumped every time the editor opens so the contentEditable surface remounts
  // with freshly-seeded HTML (via `dangerouslySetInnerHTML`) for the new move.
  const [openSeq, setOpenSeq] = useState(0);

  useEffect(() => {
    if (open) setOpenSeq((s) => s + 1);
  }, [open]);

  // Once the (re)mounted editor is on screen, focus it and place the cursor.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(cursorAtStart);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, openSeq, cursorAtStart]);

  // Run a document.execCommand against the focused editor. Toolbar buttons
  // suppress their default mousedown so the editor keeps focus + selection.
  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const applyHeading = (level: number) => {
    setHeadingAnchor(null);
    exec("formatBlock", `<h${level}>`);
  };

  const applyLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) {
      exec("createLink", url);
    } else {
      // No selection — insert the URL as its own linked text.
      exec("insertHTML", `<a href="${url}">${url}</a>`);
    }
  };

  const inlineButtons: Array<{ title: string; icon: ReactNode; run: () => void }> = [
    { title: "Bold", icon: <FormatBoldIcon fontSize="small" />, run: () => exec("bold") },
    { title: "Italic", icon: <FormatItalicIcon fontSize="small" />, run: () => exec("italic") },
    { title: "Bulleted list", icon: <FormatListBulletedIcon fontSize="small" />, run: () => exec("insertUnorderedList") },
    { title: "Numbered list", icon: <FormatListNumberedIcon fontSize="small" />, run: () => exec("insertOrderedList") },
    { title: "Blockquote", icon: <FormatQuoteIcon fontSize="small" />, run: () => exec("formatBlock", "<blockquote>") },
    { title: "Link", icon: <LinkIcon fontSize="small" />, run: applyLink }
  ];

  const handleSave = () => {
    const html = editorRef.current?.innerHTML ?? "";
    onSave(htmlToMarkdown(html));
  };

  // Keep toolbar clicks from stealing focus / clearing the editor selection.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Move notes</DialogTitle>
      <DialogContent dividers>
        {/* Formatting toolbar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
          <Tooltip title="Heading">
            <IconButton
              size="small"
              onMouseDown={keepFocus}
              onClick={(e) => setHeadingAnchor(e.currentTarget)}
              aria-label="heading"
              data-testid="note-heading-menu"
            >
              <TitleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={headingAnchor} open={Boolean(headingAnchor)} onClose={() => setHeadingAnchor(null)}>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <MenuItem
                key={level}
                onMouseDown={keepFocus}
                onClick={() => applyHeading(level)}
                data-testid={`note-heading-${level}`}
                sx={{ fontWeight: 700, fontSize: `${1.15 - (level - 1) * 0.08}rem` }}
              >
                Heading {level}
              </MenuItem>
            ))}
          </Menu>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {inlineButtons.map((btn) => (
            <Tooltip key={btn.title} title={btn.title}>
              <IconButton
                size="small"
                onMouseDown={keepFocus}
                onClick={btn.run}
                aria-label={btn.title.toLowerCase()}
              >
                {btn.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        {/* WYSIWYG editing surface — renders formatted markdown directly. The
            `key` remounts it on each open so the seeded HTML is always current. */}
        <Box
          key={openSeq}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-testid="note-editor"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(initialContent) }}
          sx={{
            minHeight: 220,
            maxHeight: 400,
            overflowY: "auto",
            p: 1.5,
            border: "1px solid #ccc",
            borderRadius: 1,
            outline: "none",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            "&:focus": { borderColor: "primary.main" },
            "& h1, & h2, & h3, & h4, & h5, & h6": { margin: "0.5rem 0", fontWeight: 700, lineHeight: 1.3 },
            "& p": { margin: "0.4rem 0" },
            "& ul, & ol": { margin: "0.4rem 0", paddingLeft: "1.5rem" },
            "& blockquote": {
              borderLeft: "3px solid #ddd",
              margin: "0.4rem 0",
              paddingLeft: "12px",
              color: "#666"
            },
            "& a": { color: "primary.main" },
            "&:empty::before": {
              content: '"Write your notes here…"',
              color: "#aaa"
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Tooltip title="Cancel">
          <IconButton onClick={onCancel} color="inherit" aria-label="cancel note">
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Save">
          <IconButton onClick={handleSave} color="primary" aria-label="save note">
            <SaveIcon />
          </IconButton>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
