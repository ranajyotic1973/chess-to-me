# Archived Changes

Index of completed, archived OpenSpec changes for Chess To Me, newest first. Each
entry links to the change folder, which contains its `proposal.md`, `design.md`,
`specs/` deltas, and `tasks.md`. Delta specs were synced into `openspec/specs/`
at archive time.

**Total archived changes: 35**

## 2026-07

- [2026-07-05 retro-analysis-panel-refinements](2026-07-05-retro-analysis-panel-refinements/) — Fix the vanishing "Moves of selected line" box, keep board/chat size in Deep Analysis, WYSIWYG markdown note editor, and PGN-compliant note comments.
- [2026-07-04 analysis-line-controls-and-version](2026-07-04-analysis-line-controls-and-version/) — Auto-derive the app version, explain positions earlier, add a "moves of selected line" control, and make the line list collapsible.
- [2026-07-04 refactor-advanced-analysis-notes](2026-07-04-refactor-advanced-analysis-notes/) — Click-to-edit per-move notes with markdown and AI-analysis import in advanced analysis mode.
- [2026-07-03 improve-line-detail-and-llm-analysis](2026-07-03-improve-line-detail-and-llm-analysis/) — Show actually-played moves with keyboard navigation and only explain the selected/matching line.
- [2026-07-03 improve-analysis-panel](2026-07-03-improve-analysis-panel/) — Make LLM responses easier to notice and analyze the current position instead of the next move.
- [2026-07-03 highlight-current-move-in-line](2026-07-03-highlight-current-move-in-line/) — Visually highlight the current move within a line's SAN sequence during navigation.

## 2026-06

- [2026-06-30 fix-analysis-mode-and-list-wrapping](2026-06-30-fix-analysis-mode-and-list-wrapping/) — Restore step-by-step line navigation, match user moves to lines with LLM analysis, and limit list text wrapping.
- [2026-06-30 fix-analysis-board-bugs](2026-06-30-fix-analysis-board-bugs/) — Add a notation-format control, adapt the board layout, fix piece movement, and stop unsolicited line auto-selection.
- [2026-06-20 version-display-and-icon-size](2026-06-20-version-display-and-icon-size/) — Show the app version in the title bar and enlarge the app icon.
- [2026-06-20 fix-info-bar-and-list-scroll](2026-06-20-fix-info-bar-and-list-scroll/) — Auto-dismiss the status banner and keep the list back-button header pinned while scrolling.
- [2026-06-19 smooth-otb-import-progress](2026-06-19-smooth-otb-import-progress/) — Show smooth overall progress across OTB archive imports instead of per-file 0→100 resets.
- [2026-06-14 opening-and-endgame-training-agents](2026-06-14-opening-and-endgame-training-agents/) — Add scaffolded, story-rich Opening and Endgame training modes for kids.
- [2026-06-14 games-database-import-setup](2026-06-14-games-database-import-setup/) — In-app onboarding to download and import Lumbrasgigabase OTB games.
- [2026-06-14 deep-analysis-and-position-notes](2026-06-14-deep-analysis-and-position-notes/) — Deep engine-backed analysis (strategy, sacrifice, novelty, endgame) with position notes saved to PGN.
- [2026-06-13 user-profile-puzzle-points](2026-06-13-user-profile-puzzle-points/) — Encouraging points tally tied to puzzle performance for kids.
- [2026-06-13 lichess-puzzle-and-games-db](2026-06-13-lichess-puzzle-and-games-db/) — Local database of 6M+ rated Lichess puzzles and a curated OTB games library.
- [2026-06-13 cross-platform-installers](2026-06-13-cross-platform-installers/) — Package installers for Windows, macOS, and Linux across x86/x64/arm64.
- [2026-06-08 chess-puzzle-and-analysis-features](2026-06-08-chess-puzzle-and-analysis-features/) — Audit and complete puzzle mode, inline analysis, and per-move explanation features.

## 2026-05

- [2026-05-26 board-editor-and-chat-ux](2026-05-26-board-editor-and-chat-ux/) — Drag-to-edit board position setup plus chat keyboard shortcuts and visual polish.
- [2026-05-22 manual-analysis-engine-lines](2026-05-22-manual-analysis-engine-lines/) — User-controlled, engine-backed line analysis with keyboard-friendly variation navigation.
- [2026-05-22 llm-response-types-and-memory](2026-05-22-llm-response-types-and-memory/) — Support puzzle/training/annotated-game response types with persistent conversation memory and token optimization.
- [2026-05-21 add-llm-chess-tools](2026-05-21-add-llm-chess-tools/) — Let the LLM validate moves and manipulate the board for interactive exploration.
- [2026-05-01 enhance-llm-chess-analysis](2026-05-01-enhance-llm-chess-analysis/) — Grandmaster-role system prompts and normalized engine output (centipawns vs win%) for better explanations.
- [2026-05-01 conditional-engine-path-ui](2026-05-01-conditional-engine-path-ui/) — Hide engine-path controls when the engine is auto-detected.

## 2026-04

- [2026-04-18 material-ui-redesign](2026-04-18-material-ui-redesign/) — Replace Blueprint.js with Material UI and split the monolithic App into modules.
- [2026-04-18 responsive-board-layout](2026-04-18-responsive-board-layout/) — Two-panel board/controls layout that fits the viewport without page scrollbars.
- [2026-04-18 integrate-ollama-stockfish-logs](2026-04-18-integrate-ollama-stockfish-logs/) — App-managed Ollama/Stockfish with a log-monitoring surface in the analysis workspace.
- [2026-04-18 divide-main-window](2026-04-18-divide-main-window/) — Give the board and chat/panels predictable, non-stacking regions.
- [2026-04-11 stockfish-report-parser](2026-04-11-stockfish-report-parser/) — Parse Stockfish lines into structured, actionable moves and unify FEN/PGN import.
- [2026-04-10 replace-tailwind-with-blueprint](2026-04-10-replace-tailwind-with-blueprint/) — Swap Tailwind for a bundled Blueprint.js UI stack (no CDN/PostCSS).
- [2026-04-10 fix-chessboardjs-global](2026-04-10-fix-chessboardjs-global/) — Fix the `window.Chessboard` vs `window.ChessBoard` casing so the board initializes.
- [2026-04-10 fix-chessboard-rendering-rounded](2026-04-10-fix-chessboard-rendering-rounded/) — Fix blank-board reliability and add rounded edges for visual cohesion.
- [2026-04-09 chessboardjs-tailwind-llm-enhancements](2026-04-09-chessboardjs-tailwind-llm-enhancements/) — chessboardjs integration, Tailwind styling, and chess-only LLM analysis and chat.
- [2026-04-09 tailwindcss-style-fix](2026-04-09-tailwindcss-style-fix/) — Fix PostCSS/Tailwind wiring so compiled utility CSS actually loads.
- [2026-04-09 convert-to-openspec](2026-04-09-convert-to-openspec/) — Remove legacy BMAD tooling and capture the project as spec-driven OpenSpec artifacts.
