## Why

The current renderer is tightly coupled to Blueprint.js, which makes it hard to troubleshoot layout issues and prevents us from adopting the Material UI aesthetic we now prefer. Replacing the styling stack with Material UI and breaking the monolithic App.jsx into smaller layout/logic modules will improve debugging speed and align the desktop UI with the desired design direction.

## What Changes

- Replace Blueprint components/CSS with Material UI components, theme overrides, and CSS-in-JS helpers so every render path is styled consistently without Blueprint imports.
- Break src/App.jsx into focused modules (e.g., AnalysisBoard, SettingsPanel, ChatPanel, StatusBanner) that each manage their own layout and props, making it easier to upgrade or test individual sections.
- Add new docs and architectural notes describing the Material UI pattern, theming strategy, and module boundaries so future maintenance is straightforward.

## Capabilities

### New Capabilities
- material-ui-renderer: Renderer UI is driven by Material UI components and themes; Blueprint CSS and components are removed, but the same functional flows (settings gating, board + analysis, chat, status) remain.
- modular-analysis-layout: The analysis/settings screen is composed of dedicated modules (board, chat, status, settings) with explicit props/state boundaries so that logic + layout can be debugged component by component.

### Modified Capabilities
- None

## Impact

- Touches src/App.jsx (split into multiple files under src/components/), src/styles.css (minimal global overrides + Material theme), and package.json (remove Blueprint/npm css imports, add @mui/material, @mui/icons-material, @emotion/react, @emotion/styled).
- Documentation updates under docs/ and README.md to explain the new theme and module structure.
- No backend or Electron APIs change.
