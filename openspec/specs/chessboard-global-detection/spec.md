# chessboard-global-detection Specification

## Purpose
TBD - created by archiving change fix-chessboardjs-global. Update Purpose after archive.
## Requirements
### Requirement: Detect ChessboardJS constructor before initialization
The renderer SHALL check both window.ChessBoard and window.Chessboard for the constructor before attempting to create a board, preventing false negatives when the bundled script exposes only one form of the global.

#### Scenario: Constructor available as ChessBoard
- **WHEN** the analysis view becomes active and window.ChessBoard is defined but window.Chessboard is not
- **THEN** the renderer proceeds to create the ChessboardJS widget without raising the  ChessboardJS failed to load error

### Requirement: Retry detection during initial mount
If the constructor is not yet available, the renderer SHALL retry detection for at least 2 seconds before declaring failure, avoiding temporary race conditions between script loading and React rendering.

#### Scenario: Delayed constructor registration
- **WHEN** the analysis view renders before the ChessboardJS script finishes loading
- **THEN** the renderer polls for the constructor for multiple short intervals, and once it appears it initializes the board instead of showing an error

