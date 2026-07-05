## Why

The current Notes panel in advanced analysis mode is disconnected from the move context and difficult to manage. Users need a streamlined way to add notes directly to specific moves in the line, with support for markdown formatting and the ability to incorporate AI analysis. Implementing a click-to-edit notes system will improve the workflow for detailed analysis work.

## What Changes

- **Remove**: The existing Notes panel component completely
- **Add**: Click-on-move notes functionality with two-popup workflow
- **Add**: Markdown editor with formatting toolbar for note editing
- **Add**: Visual indicator (small bar) on moves that have notes
- **Add**: PGN export with embedded notes for saving analyzed lines
- **Modify**: Advanced analysis mode UI to prompt users to click moves for notes
- **Modify**: Line details control to store notes per-move as markdown

## Capabilities

### New Capabilities
- `move-level-notes`: Click on moves in line details to add/edit markdown notes with AI content import option
- `markdown-note-editor`: Markdown editor with formatting toolbar for writing and editing notes
- `pgn-export-with-notes`: Export analyzed lines to PGN format with embedded markdown notes
- `ai-notes-import`: Option to copy LLM analysis into note editor with formatting preserved

### Modified Capabilities
- `advanced-analysis-panel`: Remove notes panel, add move-click notes UI and hint text
- `line-details-control`: Store per-move markdown notes and display note indicator on noted moves

## Impact

- **UI Components**: SelectedLineDetail, advanced analysis panel UI refactoring
- **State Management**: Line notes storage (per-move markdown strings), note editor modal state
- **Dialogs**: Two popup dialogs for AI notes import confirmation and note editing
- **Utilities**: Markdown editor component, PGN export with notes conversion, note indicator UI
- **Dependencies**: Markdown editor library (if not already available; check for MDEditor or similar)
