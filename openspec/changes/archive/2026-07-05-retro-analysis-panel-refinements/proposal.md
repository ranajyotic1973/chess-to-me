## Why

The analysis panel had several rough edges reported during use: the "Moves of selected line" box disappeared the moment engine analysis finished after a user picked a line; the board and chat column shrank in Deep Analysis mode; the note editor showed raw markdown source instead of formatted text; and per-move notes were embedded in PGN in a way that could break strict PGN parsers. This change captures the refinements that address all of these (already implemented and verified this session).

## What Changes

- Fix the "Moves of selected line" box vanishing when engine analysis completes after the user explicitly selected a line.
- Reorder the analysis panel so "Moves of selected line" sits above "Moves Played", and give both boxes a consistent, numbered in-box heading (`2. Moves of selected line`, `3. Moves Played`).
- Keep the board the same size in Deep/Advanced Analysis mode as in plain analysis (board width fixed at 60%), so neither the board nor the chat column shrink.
- Stop rendering the deep-analysis field labels (Strategy, Pros & Cons, Counter-attack, Sacrifice, Novelty, Endgame chances, Alternatives) inside the "Moves Played" box.
- Replace the raw-markdown note editor textarea with an inline WYSIWYG editor that renders formatted markdown directly; notes are still stored and saved as markdown.
- Update the note toolbar: remove the inline-code button; add a numbered-list button and a Heading menu offering H1–H6 (alongside bold, italic, bulleted list, blockquote, link).
- Make embedded PGN note comments compliant: escape both `{` and `}`, normalize CRLF to LF, and re-number a Black move that follows a commented White move with an `N...` indication.

## Capabilities

### New Capabilities
<!-- None — all affected capabilities already have specs. -->

### Modified Capabilities
- `selected-line-moves-panel`: The box persists across the post-selection analysis pass, is positioned above "Moves Played", and uses a numbered in-box heading consistent with the moves-played box.
- `deep-analysis-mode`: The board (and consequently the chat column) keeps its normal size in advanced mode; deep-analysis field labels are no longer shown inside the "Moves Played" box.
- `markdown-note-editor`: The editor is an inline WYSIWYG surface (renders markdown, saves markdown) with a revised toolbar (headings H1–H6, numbered list added, inline-code removed).
- `pgn-export-with-notes`: Note comments are escaped and re-numbered to conform to PGN movetext rules.

## Impact

- Renderer: `src/App.tsx` (board sizing, `handleAnalysisSuccess` selection guard), `src/components/ChatPanel.tsx` (panel order + numbering), `src/components/SelectedLineDetail.tsx` (numbered heading, deep-analysis fields removed), `src/components/SelectedLineMoves.tsx` (numbered heading), `src/components/NoteEditorPopup.tsx` (WYSIWYG rewrite).
- New util: `src/utils/markdownHtml.ts` (pure, DOM-free markdown↔HTML converter) with `src/utils/markdownHtml.test.ts`.
- Modified util: `src/utils/pgnNotes.ts` (brace escaping, CRLF normalization, Black re-numbering) with updated `src/utils/pgnNotes.test.ts`.
- Tests: new `tests/integration/note-editor.spec.ts`; extended `tests/integration/analysis-line-controls.spec.ts`.
- No new runtime dependencies; no changes to the Electron main process or IPC surface.
