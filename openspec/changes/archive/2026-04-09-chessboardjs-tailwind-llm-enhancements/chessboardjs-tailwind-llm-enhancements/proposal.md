## Why

The current app loads a blank board, crashes due to initialization order, relies on CDN assets, and lacks the structured UX requested (settings-first entry, Tailwind layout, responsive sizing, and chessboarding analysis powered by Stockfish and an LLM). Addressing these issues now will create a stable, self-hosted experience with the requested UI/UX improvements and chess analysis logic.

## What Changes

- Replace CDN dependencies with local Tailwind/PostCSS tooling and install chessboardjs from npm so the board renders without remote assets.
- Rebuild the UI/UX so the settings screen is the first view, persists after save, hides any menus/title text, and navigates via a button to the real analysis view that features a gear icon, no extraneous headers, and a responsive no-scroll layout.
- Integrate chessboardjs with draggable pieces starting from the standard position, re-rendering when FEN is pasted, sending FEN to Stockfish, passing analysis to the LLM for risk/plan commentary, and allowing user questions about the current position; ensure the chat textarea grows to 10–15 lines before scrolling.

## Capabilities

### New Capabilities
- `ui-settings-flow`: Provide a settings-first experience that persists after saving, hides menus/titles, exposes a button to open the analysis view, and decorates the analysis view with the requested gear icon while keeping the app confined to a laptop viewport with no scrollbars except the chat textarea.
- `ui-responsive-board-layout`: Implement a Tailwind- and PostCSS-driven layout (no CDN) that fits the entire app in one screen, ensures the chessboard is visible and draggable, enforces the chat textarea size requirement, and removes placeholder text such as "Tailwind + ChessboardJS analysis studio" and "Chess To Me".
- `chessboardjs-llm-analysis`: Install and configure chessboardjs to render the start position, re-render on pasted FEN, send FEN to Stockfish, shell the resulting analysis to an LLM for pure-chess explanations (risk/plan), and let the user ask position-specific questions through the same interface.

### Modified Capabilities
- `<existing-name>`: <what requirement is changing>

## Impact

- Replaces CDN Tailwind usage with PostCSS/Tailwind CLI, so build tooling needs updating and configuration added.
- Touches the main renderer/App component for state/flow changes and new UI, plus adds stockfish & chessboardjs dependencies and their integration logic.
- May affect platform/build scripts if new tooling (Tailwind CLI/PostCSS) requires extra setup or bundler config.
