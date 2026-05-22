## MODIFIED Requirements

### Requirement: Engine lines are source of truth for analysis
The system SHALL use configured engine (Stockfish/LC0) to generate analysis lines and provide those lines directly to user and LLM context. All lines SHALL be reliably displayed in UI popup.

#### Scenario: Engine analysis displayed with line numbers in popup
- **WHEN** analysis completes
- **THEN** top 4 engine lines are displayed in modal popup as: "Line 1: e2-e4...", "Line 2: d2-d4...", etc. with move counts

#### Scenario: Engine lines sent to LLM context
- **WHEN** user asks a question about position
- **THEN** LLM receives: "Top engine lines for this position are: [lines]" with full variations

#### Scenario: LLM explains engine lines only
- **WHEN** LLM responds to user question
- **THEN** LLM explains why engine lines are strong, not suggesting different moves

#### Scenario: Popup displays even with many lines
- **WHEN** engine returns 4+ variations
- **THEN** modal popup reliably displays all lines with scrolling if needed

## ADDED Requirements

### Requirement: Line preview shows move count without full explanation
The system SHALL display only the first few moves of each line in the modal, appending move count for context. Full explanation shown only on line selection.

#### Scenario: Modal shows truncated lines with move counts
- **WHEN** analysis modal displays lines
- **THEN** each line shows: "Line 1: e2-e4 e7-e5 g1-f3 (6 moves)" without explanation

#### Scenario: Full explanation appears on line selection
- **WHEN** user clicks on a line
- **THEN** the full explanation and all moves are displayed in side panel

### Requirement: Line selection is reliable and responsive
The system SHALL ensure that clicking a line in the modal reliably selects it with visual feedback.

#### Scenario: Selected line is visually highlighted
- **WHEN** user clicks on a line
- **THEN** line is highlighted with distinct background color and bold text

#### Scenario: Keyboard navigation works with selected line
- **WHEN** line is selected from modal
- **THEN** arrow keys can navigate through moves of that line

#### Scenario: Line remains selected during interaction
- **WHEN** user interacts with the board after selecting a line
- **THEN** line selection is preserved and can be navigated
