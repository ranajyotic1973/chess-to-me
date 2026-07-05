## Context

This change is retroactive: the work was implemented and verified in one session (585 unit tests, 29 integration tests, clean build) before being captured as an OpenSpec change. It bundles four analysis-panel refinements that share the same surface area (the analysis panel, the note editor, and PGN export) but are otherwise independent. The renderer is an Electron + React app; per project rules the note editor and layout live entirely in the renderer, engine/LLM routing stays in the main process, and web assets use relative paths.

## Goals / Non-Goals

**Goals:**
- Keep a user-selected engine line's "Moves of selected line" box visible across the follow-up analysis pass.
- Present "Moves of selected line" and "Moves Played" as consistent, numbered, stacked boxes.
- Preserve the board (and chat column) size when entering Advanced Analysis mode.
- Remove deep-analysis field labels from the "Moves Played" box.
- Make the note editor a WYSIWYG surface that renders markdown while still storing/saving markdown, with an updated toolbar.
- Make embedded PGN note comments conform to PGN movetext rules.

**Non-Goals:**
- No new runtime dependencies (no WYSIWYG editor library, no jsdom in tests).
- No changes to engine/LLM routing, IPC surface, or the main process.
- Not removing deep-analysis computation — only its inline display in the "Moves Played" box.
- No full CommonMark support in the note editor — only the bounded subset the toolbar can produce.

## Decisions

- **Selection-persistence fix in `handleAnalysisSuccess`.** The `else` branch (starting position / White hasn't moved) unconditionally called `deselectEngineLine()`, which nulled the selection when a line was picked from near the start (resulting FEN move number still 1). Decision: mirror the guard already used in the `if` branch — only clear an *auto*-selection; when the user explicitly selected a line, keep it and update the base FEN. Alternative considered: gate the box on `selectedLineAnalysisEntry` alone, rejected because selection state must stay coherent for downstream effects (move matching, LLM explanation).

- **Numbered in-box headings via an `index` prop.** `SelectedLineMoves` and `SelectedLineDetail` each already render their own styled box; adding an optional `index` prop that prefixes the in-box heading keeps both boxes visually consistent and removes the previously duplicated outer header. Alternative: external numbered headers — rejected as it produced a double header for "Moves Played".

- **Constant board width.** `boardSize` dropped board width to 40% in advanced mode; since the board is square and the chat column height tracks `layoutHeight = boardHeight + 110`, that shrank both. Decision: fix board width at 60% in every mode. The advanced-mode grid columns were unchanged anyway, so the 40% only produced empty space.

- **DOM-free markdown↔HTML converter (`src/utils/markdownHtml.ts`).** The editor is a `contentEditable` surface; on save its HTML must become markdown, and on open markdown must become HTML. Decision: implement both directions as pure functions — `markdownToHtml` is a line/block parser; `htmlToMarkdown` uses a small, forgiving HTML tokenizer + tree walk rather than the DOM. Rationale: the project runs unit tests in the Node environment with no jsdom; a DOM-free implementation is testable there and behaves identically in the renderer. Alternatives considered: (a) add `jest-environment-jsdom` — rejected to avoid a new dev dependency and CI env change; (b) adopt a WYSIWYG library — rejected (no CDN allowed, bundle cost, offline install risk).

- **`contentEditable` + `document.execCommand` for editing.** execCommand is deprecated but universally supported in the Chromium renderer and is the pragmatic way to apply bold/italic/lists/headings/blockquote/links to a selection. The editor remounts per open (keyed) with `dangerouslySetInnerHTML` seeding, which proved more reliable than imperatively setting `innerHTML` in an effect on reopen.

- **PGN compliance in `buildPgnWithNotes`.** Escape both braces (comments cannot nest or contain a literal brace), normalize CRLF→LF, and track whether the previous move emitted a comment so a following Black move is re-numbered `N...`.

## Risks / Trade-offs

- [execCommand is deprecated] → Acceptable: the renderer is Chromium where it is stable; the conversion logic (the risky part) is pure and unit-tested independently of execCommand.
- [Hand-rolled markdown subset may miss edge cases (nested emphasis, nested lists)] → Mitigated by constraining scope to what the toolbar produces and covering both directions plus round-trips with unit tests; unsupported constructs degrade to plain text rather than crashing.
- [Removing the deep-analysis field display leaves that data with no UI surface] → Documented in the delta spec's REMOVED migration note; the data remains in state for any future re-surfacing.
- [Retroactive capture] → Specs and code could drift; mitigated by writing the deltas to match the shipped implementation and its tests.
