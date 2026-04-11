## Purpose
Ensure the ChessboardJS view reliably renders once settings are complete and keep the controls visually aligned with the Blueprint UI through consistent rounded edges.

## Requirements

### Requirement: Chessboard renders whenever the analysis view is visible
The renderer SHALL mount and keep a ChessboardJS instance inside the analysis view so that a visible chessboard exists after the settings gate is cleared or whenever a FEN is applied.

#### Scenario: Rendering analysis view
- **WHEN** the user saves settings, clicks "Go to analysis", or pastes a valid FEN while the analysis view is active
- **THEN** the ChessboardJS instance is initialized on the board container, draggable pieces are enabled, and the board displays the expected position without leaving a blank container

### Requirement: Board-adjacent controls use rounded corners
The board wrapper and nearby control cards SHALL have a consistent rounded border radius so they visually match other Blueprint cards in the application.

#### Scenario: Displaying rounded controls
- **WHEN** the analysis view renders
- **THEN** the `.board-wrapper`, `.analysis-panel` card, and FEN/chat control blocks all have gently rounded corners (e.g., `border-radius: 0.5rem`) and no sharp edges that clash with the rest of the UI
