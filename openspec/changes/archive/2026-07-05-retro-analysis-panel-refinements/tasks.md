<!-- Retroactive change: all tasks were completed and verified this session. -->

## 1. Selected-line moves panel

- [x] 1.1 Guard `handleAnalysisSuccess` so the `else` (White-hasn't-moved) branch keeps a user-selected line instead of calling `deselectEngineLine()`; update base FEN and move index (`src/App.tsx`)
- [x] 1.2 Add an optional `index` prop to `SelectedLineMoves` and render a numbered in-box heading (`src/components/SelectedLineMoves.tsx`)
- [x] 1.3 Add an optional `index` prop to `SelectedLineDetail` and render a numbered in-box heading; remove the duplicated outer "Moves Played" header (`src/components/SelectedLineDetail.tsx`, `src/components/ChatPanel.tsx`)
- [x] 1.4 Reorder the panel so "Moves of selected line" (index 2) sits above "Moves Played" (index 3), with "Line Analysis"/"Chat Response" renumbered (`src/components/ChatPanel.tsx`)
- [x] 1.5 Add integration coverage: box stays visible after selecting a line from the start position (`tests/integration/analysis-line-controls.spec.ts`)

## 2. Deep analysis mode layout

- [x] 2.1 Fix `boardSize` to keep board width constant at 60% in all modes so board and chat column don't shrink in advanced mode (`src/App.tsx`)
- [x] 2.2 Remove the deep-analysis field labels block (Strategy, Pros & Cons, etc.) from the "Moves Played" box and clean up now-unused props/imports (`src/components/SelectedLineDetail.tsx`)

## 3. WYSIWYG markdown note editor

- [x] 3.1 Add a pure, DOM-free `markdownToHtml` / `htmlToMarkdown` converter for the supported subset (`src/utils/markdownHtml.ts`)
- [x] 3.2 Add unit tests for both directions and round-trips (`src/utils/markdownHtml.test.ts`)
- [x] 3.3 Rewrite `NoteEditorPopup` as an inline WYSIWYG `contentEditable` surface seeded from markdown and saved as markdown (`src/components/NoteEditorPopup.tsx`)
- [x] 3.4 Update the toolbar: remove inline-code; add numbered list and a Heading menu (H1–H6); keep bold, italic, bulleted list, blockquote, link
- [x] 3.5 Add integration coverage: type + format a note, save as markdown, reopen rendered (`tests/integration/note-editor.spec.ts`)
- [x] 3.6 Update the `markdown-note-editor` main spec to describe the WYSIWYG editor and new toolbar

## 4. PGN export with notes

- [x] 4.1 Escape both `{` and `}` in note comments and normalize CRLF to LF in `buildPgnWithNotes` (`src/utils/pgnNotes.ts`)
- [x] 4.2 Re-number a Black move that follows a commented White move with an `N...` indication (`src/utils/pgnNotes.ts`)
- [x] 4.3 Extend unit tests for brace escaping, CRLF normalization, and Black re-numbering (`src/utils/pgnNotes.test.ts`)

## 5. Verification

- [x] 5.1 `npm test` passes (585 unit tests)
- [x] 5.2 `npm run test:integration` passes (29 integration tests)
- [x] 5.3 `npm run build` succeeds (no TypeScript errors)
- [x] 5.4 Refresh the knowledge graph (`graphify update .`)
