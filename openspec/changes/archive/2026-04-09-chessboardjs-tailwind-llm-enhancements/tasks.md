## 1. Tailwind & dependency setup
- [x] 1.1 Install tailwindcss, postcss, and autoprefixer and configure tailwind.config.js plus the Vite plugin so the renderer can emit Tailwind builds.
- [x] 1.2 Introduce a Tailwind stylesheet entry point and import it from src/main.jsx ahead of other styles so the utilities become available to every component.

## 2. Board & layout integration
- [x] 2.1 Replace the existing board renderer with a chessboardjs wrapper that defaults to start, keeps pieces draggable, and exposes setPosition for FEN updates.
- [x] 2.2 Rebuild the renderer layout with Tailwind utility classes so the board, controls, and chat panels fit a standard laptop viewport with no page scrollbars.
- [x] 2.3 Ensure the FEN paste controls call setPosition(fen), update the board, and send the FEN to Stockfish via the existing IPC channel.

## 3. Analysis & LLM flow
- [x] 3.1 Trigger Stockfish analysis whenever a FEN is set and stream the PV results back to the renderer for display.
- [x] 3.2 After each analysis, call the LLM with a chess-only prompt that describes risks/plans and show the explanation once it arrives.
- [x] 3.3 Provide a coach-style chat interface that attaches the current FEN to each question and reuses the same LLM pipeline for chess-only answers.

## 4. Layout polish & validation
- [x] 4.1 Tune the Tailwind theme colors/spacing so the UI feels cohesive while avoiding page scrollbars in laptop resolutions.
- [x] 4.2 Verify that only the chat textarea/analysis log scroll internally but the overall page stays static on 1366x768 and similar screens.
- [x] 4.3 Confirm that all LLM responses mention Stockfish insights, remain purely chess-focused, and reference the player whose turn it is.
