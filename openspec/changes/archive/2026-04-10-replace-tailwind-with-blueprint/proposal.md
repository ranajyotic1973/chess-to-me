## Why
Tailwind is hard to maintain without PostCSS in this Electron repo, and the renderer still depends on generated utilities that frequently fail to appear in the dev build. We need a bundled UI stack that ships with the application, avoids CDN/PostCSS, and delivers the desktop-style controls our users expect.

## What Changes
- Replace Tailwind-based markup/styling with Blueprint.js components so we rely on component-specific CSS that ships from npm (no CDN, no PostCSS build step required).
- Rebuild the analysis/settings layout using Blueprint containers, cards, buttons, text inputs, and toast/typography tokens so the UI remains consistent across Electron builds without Tailwind.
- Update docs and scripts to reflect the new dependency, remove the `tailwind:build` workflow, and ensure the renderer still passes the same behavior (FEN input, chat, status chips) using Blueprint styles.

## Capabilities
### New Capabilities
- `blueprint-desktop-ui`: Use Blueprint.js components and CSS to render the analysis interface, chat panel, and settings controls while maintaining the existing functionality (Stockfish/LLM integration, draggable board, FEN input, etc.) without Tailwind or PostCSS.

### Modified Capabilities
- `<existing-name>`: <what requirement is changing>

## Impact
- Removes Tailwind/PostCSS tooling from the renderer, replacing it with Blueprint.js CSS imports and component wrappers.
- Touches `src/App.jsx`, `src/styles.css`, `src/main.jsx`, and any layout helpers to swap the Tailwind-based layout for Blueprint containers/buttons.
- Updates documentation (README) and scripts to stop referencing the Tailwind build step and mention the new Blueprint dependency.
