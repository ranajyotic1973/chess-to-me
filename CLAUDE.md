# Chess To Me — Project Rules

## Purpose

This application is a chess training tool for kids aged 4–18. Every feature, UI decision, and content choice must be appropriate for that age range. The experience should be encouraging, clear, and safe.

## Code Rules

### UI wrapper
For any component in UI
- Do not add unnecessary wrapper unless user asks
- Keep the UI as lean as possible so loading and rendering is quick
- All buttons should be considered icon buttons unless user explicitly says otherwise or appropriate icon is not found from fontawesome

### Code Architecture
Functional code writing should follow the following rules
- Use interface driven code where interfaces are used for variables and instance of the implementing class gets injected
- Real objects should be represented by separate classes as much as possible
- The chess board is the main component, all it's events must be handled properly
- Code must be event driven as much as possible, minimal use of states.

### Unit Tests Required
All files containing logic must have a corresponding test file. This applies to:
- Utility functions (`src/utils/`)
- Backend handlers with decision logic (`electron/`)
- Any pure function that takes input and produces output

Tests live alongside the code they test (e.g. `src/utils/foo.ts` → `src/utils/foo.test.ts`). Do not add a feature or fix a bug in a logic file without updating or adding the matching test.

### Integration Tests Required
All user interactions with the board must have a corresponding integration test. This applies to 
- Mouse interactions
- Keyboard interactions
- Correctness of display on the screen with respect to the previous 2 interactions
Integrations tests must use headless browser so tests can execute in github build. They must also use mock chess engine and mock LLM for all tests.
Any new interaction must accompany new integration tests.

### Testing Checklist Before Committing
**MANDATORY**: Before creating any commit, ensure ALL tests pass:

```bash
# Run unit tests
npm test

# Run integration tests  
npm run test:integration

# Verify build succeeds
npm run build
```

**All three must succeed** (0 failures) before committing. Failing tests block the GitHub Actions CI pipeline and prevent merging to main.

- **Unit tests** verify individual functions, classes, and modules work correctly
- **Integration tests** verify features work end-to-end in the application
- **Build** verifies no TypeScript errors and all assets are properly bundled

**GitHub CI Requirements:**
The `.github/workflows/ci.yml` pipeline automatically runs on every push and PR to main:
1. Install dependencies
2. Run `npm test` (unit tests via Jest)
3. Run `npm run test:integration` (integration tests via Playwright)
4. Run `npm run build` (TypeScript + Vite)

If any step fails, the PR cannot be merged. Fix failing tests locally before pushing.

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

### Analysis State Management
The analysis workflow (engine → LLM explanation) requires careful state orchestration:
- **`isAnalysisRunning`**: Master flag for both engine and LLM phases. Set `true` at engine start, `false` only after LLM completes (or on error/cancel).
- **`engineAnalysisDone`**: Set `true` only when engine returns valid lines. Guards LLM phase: check `engineAnalysisDone && analysisEntries.length > 0` before calling LLM.
- **`analysisStatus`**: Update at each phase transition (engine start → "Analyzing...", engine done → "Generating explanation...", complete → "Analysis complete."). Auto-clears after 2s.
- **Spinner logic**: The Backdrop checks `isAnalysisRunning || engineAnalyzing` for engine phase and `isLlmAnalysisRunning` for LLM phase. Both spinners show as long as analysis is ongoing.
- **Race condition prevention**: LLM (`fetchExplanations`) checks the guard condition before calling `electronAPI.explainLines`. If engine failed or has no results, status updates and LLM is skipped.

### Web Asset Paths — Relative Only
This is an Electron application. In production the renderer is loaded from an ASAR bundle via `file://`, so absolute web paths (e.g. `/assets/foo.js`, `/chesspieces/wK.png`) resolve against the filesystem root and fail silently, causing blank screens or missing images.

- **Never use an absolute path** (leading `/`) for any web asset: scripts, stylesheets, images, fonts, or any `src`/`href`/`url()` value in renderer code.
- Always use **relative paths** (`./`, `../`) in TSX/CSS/HTML for anything that is loaded by the browser context.
- `vite.config.ts` must keep `base: "./"` — do not remove or change this.
- Native OS filesystem paths in the Electron main process (`electron/main.ts`, `electron/preload.ts`) are unaffected by this rule; they are not web URLs.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
