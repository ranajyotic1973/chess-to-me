# Chess To Me — Project Rules

## Purpose

This application is a chess training tool for kids aged 4–18. Every feature, UI decision, and content choice must be appropriate for that age range. The experience should be encouraging, clear, and safe.

## Code Rules

### UI wrapper
For any component in UI
- Do not add unnecessary wrapper unless user asks
- Keep the UI as lean as possible so loading and rendering is quick
- All buttons should be considered icon buttons unless user explicitly says otherwise or appropriate icon is not found from fontawesome

### Unit Tests Required
All files containing logic must have a corresponding test file. This applies to:
- Utility functions (`src/utils/`)
- Backend handlers with decision logic (`electron/`)
- Any pure function that takes input and produces output

Tests live alongside the code they test (e.g. `src/utils/foo.ts` → `src/utils/foo.test.ts`). Do not add a feature or fix a bug in a logic file without updating or adding the matching test.

### Language and Content
- All LLM prompts must produce child-appropriate explanations — no adult themes, no intimidating language.
- Puzzle difficulty labels (`easy`, `medium`, `hard`) should match what a child aged 4–18 can reasonably attempt.
- Error messages and UI copy should be encouraging, not discouraging (e.g. "Try again!" not "Wrong.").

### Puzzle Mode
- Piece dragging on the board is **disabled** in puzzle mode. Children must type moves in the chat (UCI format, e.g. `e2e4`) so they visualise the move in their head before playing it.
- Forward arrow-key navigation through the solution is locked until "Reveal Solution" is explicitly clicked.
- A retry button is always visible after an incorrect attempt.

### Provider and Model Selection
- The LLM provider saved in settings must never be overridden by a default or stale component state. Always read the saved provider after settings have loaded before making any LLM call.
- Do not default to Ollama when a cloud provider is saved.

### Performance
- Each user question must trigger exactly one LLM pipeline (PASS 1 classification + PASS 2 generation). Do not call `askQuestion` more than once per user message.
- Reasoning models (model names containing "reasoning") have a 300 s generation timeout; standard cloud models use 120 s; Ollama uses 60 s.

### Architecture
- The Electron main process (`electron/main.ts`) owns all LLM routing and classification (PASS 1 + PASS 2). The renderer must not duplicate classification logic.
- Engine analysis (LC0 / Stockfish) is run in the main process. The renderer passes the current FEN; the main process decides whether engine lines are needed.

### Web Asset Paths — Relative Only
This is an Electron application. In production the renderer is loaded from an ASAR bundle via `file://`, so absolute web paths (e.g. `/assets/foo.js`, `/chesspieces/wK.png`) resolve against the filesystem root and fail silently, causing blank screens or missing images.

- **Never use an absolute path** (leading `/`) for any web asset: scripts, stylesheets, images, fonts, or any `src`/`href`/`url()` value in renderer code.
- Always use **relative paths** (`./`, `../`) in TSX/CSS/HTML for anything that is loaded by the browser context.
- `vite.config.ts` must keep `base: "./"` — do not remove or change this.
- Native OS filesystem paths in the Electron main process (`electron/main.ts`, `electron/preload.ts`) are unaffected by this rule; they are not web URLs.
