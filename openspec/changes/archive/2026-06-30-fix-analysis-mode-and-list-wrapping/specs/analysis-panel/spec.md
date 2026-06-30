# analysis-panel Specification (Delta)

## ADDED Requirements

### Requirement: Board move callback triggers line matching and analysis

The analysis panel's board component SHALL invoke the `onBoardMove` callback when user makes a drag/drop move. This callback SHALL trigger move matching against engine lines and subsequent LLM analysis.

#### Scenario: Move callback is invoked on successful drag/drop
- **WHEN** user drags a piece and drops it to make a move on the board, and the move is legal
- **THEN** the board component SHALL call `onBoardMove(newFen)` with the resulting position

#### Scenario: Callback is not invoked on invalid move
- **WHEN** user attempts a drag that results in snapback (illegal move)
- **THEN** `onBoardMove` SHALL NOT be called

### Requirement: Move callback routes to line matching logic

When `onBoardMove` is invoked, the handler in App.tsx SHALL attempt to match the move against the first moves of currently displayed engine lines.

#### Scenario: Move is routed to matching logic
- **WHEN** `onBoardMove` callback is invoked with a new FEN
- **THEN** the handler SHALL compare the move against engine line first moves (see user-move-matching spec)

## MODIFIED Requirements

### Requirement: Display engine analysis results
The system SHALL display LC0 analysis results in a dedicated panel, including the position evaluation, best move suggestions, and principal variation (line of play).

#### Scenario: View position analysis
- **WHEN** a chess position is shown on the board and LC0 completes analysis
- **THEN** the analysis panel displays the engine's evaluation score and top 3-5 suggested moves

### Requirement: Remove database search functionality
The system SHALL NOT include any database search, lookup, or reference features in the analysis panel. All UI components related to opening databases, endgame tablebases, or game references SHALL be removed.

#### Scenario: No database search in analysis panel
- **WHEN** user views the analysis panel
- **THEN** user does not see any database search box, game reference lookup, or tablebases options

### Requirement: Display move suggestions without database context
The system SHALL show engine-suggested moves and their evaluations based solely on LC0 analysis, without augmentation from reference databases or game statistics.

#### Scenario: Show suggested moves from engine only
- **WHEN** LC0 suggests a move as best play
- **THEN** the system displays it with the LC0 evaluation, not with additional historical data or database statistics

### Requirement: Maintain core board display
The system SHALL continue to display the chess board, current position, and allow user interaction with move entry. Board functionality SHALL not be affected by the removal of database features.

#### Scenario: Make moves on board
- **WHEN** user clicks pieces on the board to make a move
- **THEN** the board updates to show the new position and LC0 analysis updates accordingly

### Requirement: Clear notification when engine unavailable
The system SHALL inform the user clearly when LC0 is not available or analysis is not running, without displaying database fallback options.

#### Scenario: Engine not configured
- **WHEN** user opens the analysis panel but LC0 is not configured or available
- **THEN** system displays a message such as "Engine not configured. Set up LC0 in Settings to enable analysis."
