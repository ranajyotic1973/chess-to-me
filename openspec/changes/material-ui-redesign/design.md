## Context

The renderer currently imports Blueprint CSS and uses a single App.jsx to host settings, the board, chat, and status. That monolithic file makes it difficult to tinker with the layout or isolate bugs, and the Blueprint dependency pulls in CSS that isn’t aligned with the new Material UI styling direction we want.

## Goals / Non-Goals

**Goals:**
- Replace Blueprint UI with Material UI’s components/themes so the visual language matches the new desktop design.
- Split App.jsx into smaller components (board shell, settings panel, chat panel, status banner and helpers) so each module owns its props/state and is easier to debug or test individually.
- Keep existing data flow (settings gating, Stockfish analysis, LLM chat) unchanged while refactoring the layout to call smaller components.

**Non-Goals:**
- Replacing the underlying analysis, Stockfish, or Ollama behavior.
- Introducing a new state management library; React hooks remain the coordination layer.

## Decisions

1. **Component modularization** ? Create src/components/ submodules (AnalysisBoard, SettingsPanel, ChatPanel, BoardStatus) that receive props such as handlers and status strings. This keeps App.jsx focused on orchestration (state, IPC calls) and leaves DOM/CSS details inside the new files.
2. **Material UI styling** ? Replace Blueprint imports with @mui/material components (Paper, Button, TextField, Grid, Typography, CircularProgress). Use a custom theme (palette, typography) defined in src/theme.js and wrap <App /> with <ThemeProvider> to centralize color spacing.
3. **Assets & layout** ? Keep the board-wrapper CSS minimal (rounded corners, drop shadow) and rely on Material UI spacing instead of global CSS for gap/padding. Continue to manage the chessboard in the board module but provide status callbacks from App.

## Risks / Trade-offs

- [Risk] Rewriting the layout may introduce regressions if the new Material UI variant doesn’t mimic Blueprint spacing exactly. ? Mitigation: match existing padding/gaps using Material UI’s sx system and keep the same viewport-fitting constraints in styles.css.
- [Risk] Breaking App.jsx into many files might require more imports/collaboration. ? Mitigation: keep interfaces simple (props for data and callbacks) so the modules can be composed without extra hooks.

## Migration Plan

1. Install Material UI dependencies (@mui/material, @mui/icons-material, @emotion/react, @emotion/styled) and remove Blueprint CSS imports.
2. Create the Material theme entrypoint and wrap the renderer root with <ThemeProvider> (update src/main.jsx accordingly).
3. Refactor App.jsx: move markup into src/components/ modules, adjust layout to Material UI Grid/Paper, and keep existing logic hooking into services.
4. Update src/styles.css for the new rounded background/scrollbar overrides, removing Blueprint-specific selectors.
5. Adjust documentation (README) so it describes the Material UI-based renderer and how the modules fit together.

## Open Questions

- Do we need new Storybook/mock previews for the separated panels? Not at this stage.
