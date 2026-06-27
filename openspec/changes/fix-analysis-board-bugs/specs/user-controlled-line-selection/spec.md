## ADDED Requirements

### Requirement: No automatic line selection from LLM responses
The system SHALL NOT automatically select or play analysis lines based on mentions of line numbers in LLM responses.

#### Scenario: LLM mentions specific line
- **WHEN** LLM response includes text like "Line 1 suggests..." or "the best move in line 3..."
- **THEN** no line is automatically selected on the board

#### Scenario: User sees lines list without auto-playback
- **WHEN** engine analysis returns multiple lines and LLM response mentions a line number
- **THEN** all analysis lines are displayed for user selection, but the first move from any line is NOT automatically played

### Requirement: User must explicitly select analysis lines
Analysis lines SHALL only become active when the user explicitly clicks on a line in the interface.

#### Scenario: Click line to select
- **WHEN** user clicks on an analysis line in the SelectableList
- **THEN** that line is selected and its moves are displayed for navigation

#### Scenario: Keyboard shortcut to select line
- **WHEN** user types a number (1-4) corresponding to a line's rank
- **THEN** that line is selected via keyboard shortcut

### Requirement: No auto-playback on line selection
Selecting a line SHALL NOT automatically play any moves on the board.

#### Scenario: Line selected but board unchanged
- **WHEN** user selects an analysis line
- **THEN** the line is marked as selected and moves are available for step-through navigation, but no moves are automatically played on the board

### Requirement: Manual navigation through line moves
Once a line is selected, user SHALL navigate through its moves using arrow keys or explicit controls.

#### Scenario: Step through selected line manually
- **WHEN** user has selected a line and presses the right arrow key
- **THEN** the first move of the line is shown on the board and explanation is displayed

#### Scenario: No automatic advance to next move
- **WHEN** line is selected but user has not pressed any navigation key
- **THEN** the board remains at the position where the line was selected

### Requirement: Clear indication of selected line
The system SHALL provide clear visual indication of which line is currently selected and whether any moves from that line are being displayed.

#### Scenario: Visual selection indicator
- **WHEN** a line is selected
- **THEN** the line is highlighted or marked with a visual indicator (e.g., different background color, checkmark, or border)

### Requirement: User can deselect lines
The system SHALL allow users to deselect the current line and return to viewing the full lines list.

#### Scenario: Click back to deselect
- **WHEN** user clicks a back button or navigates away from a selected line's detail view
- **THEN** the line is deselected and the full analysis lines list is displayed again
