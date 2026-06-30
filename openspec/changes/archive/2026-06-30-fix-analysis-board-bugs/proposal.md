## Why

The Chess To Me analysis interface has several UX and functional bugs that degrade the learning experience for children. Users cannot control notation display format, board layout doesn't adapt to advanced analysis workflows, piece movement is unpredictable, and the system auto-selects lines without user consent. These issues create confusion and reduce the application's usability for teaching chess analysis and training.

## What Changes

- Add ability to display chess lines in both SAN (Standard Algebraic Notation) and UCI (Universal Chess Interface) notation formats with toggle option
- Dynamically resize the board when entering/exiting Advanced Analysis mode to accommodate chat and notes panels
- Implement save-on-exit dialog for position notes in Advanced Analysis mode, with PGN annotation support
- Track and update PGN in memory on every move in both forward and backward directions
- Fix piece drag-and-drop to constrain pieces to legal squares only, preventing placement anywhere on the board
- Prevent automatic selection and playback of analysis lines based on LLM responses—require explicit user selection
- Fix inconsistent piece movement behavior in Analysis and Advanced Analysis modes

## Capabilities

### New Capabilities

- `notation-display-control`: Toggle chess line notation display between SAN (Standard Algebraic Notation) and UCI (Universal Chess Interface) formats, with formatted output for both modes
- `advanced-analysis-layout`: Dynamic board sizing that expands/contracts when entering/exiting Advanced Analysis mode to optimize space for chat panel and position notes
- `position-notes-save-prompt`: Show confirmation dialog when exiting Advanced Analysis mode if notes have been modified, with option to save notes as PGN annotations
- `pgn-real-time-tracking`: Update PGN representation in memory on every board move, including forward navigation and backward retreat with keyboard controls
- `legal-moves-only-drops`: Constrain piece drag-and-drop interactions to legal square destinations, preventing invalid placements and improving piece movement reliability
- `user-controlled-line-selection`: Remove automatic line selection triggered by LLM response mentions, requiring explicit user click/selection of analysis lines

### Modified Capabilities

- `analysis-board-interaction`: Existing board move handling requires updates to handle legal-move validation and prevent auto-selection behaviors

## Impact

**Affected Code:**
- `src/App.tsx`: Layout calculations, LLM response handling, Advanced Analysis mode logic, move tracking
- `src/components/AnalysisBoard.tsx`: Chessboard.js configuration, drag-drop handlers
- `src/utils/analysisHelpers.ts`: Move notation formatting and conversion functions
- `src/components/ChatPanel.tsx`: Line display and selection UI
- `src/components/PositionNotesPanel.tsx`: Notes persistence and save dialog integration

**APIs/Dependencies:**
- chessboard.js library drag-drop configuration
- chess.js move validation
- Electron IPC for notes persistence

**Breaking Changes:** None—all changes are backward compatible fixes and enhancements.
