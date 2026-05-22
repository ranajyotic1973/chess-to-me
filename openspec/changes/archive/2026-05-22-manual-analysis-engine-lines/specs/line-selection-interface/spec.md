## ADDED Requirements

### Requirement: Display numbered engine lines
The system SHALL display each engine analysis line with a number (1, 2, 3, 4) for easy reference.

#### Scenario: Lines shown with numbers
- **WHEN** engine analysis completes
- **THEN** each line displays as "Line 1: e2-e4 d7-d5...", "Line 2: d2-d4...", etc.

#### Scenario: Line numbers clear and prominent
- **WHEN** user views analysis
- **THEN** line numbers are clearly visible for quick identification

### Requirement: Click line to select
The system SHALL allow user to click on a displayed line to select it.

#### Scenario: User clicks line in UI
- **WHEN** user clicks on "Line 2: ..." in the ChatPanel
- **THEN** that line is selected and memorized

#### Scenario: Selected line highlighted
- **WHEN** line is selected
- **THEN** the selected line is visually highlighted (e.g., bold, colored background)

### Requirement: Tell LLM line number for selection
The system SHALL detect when user mentions a line number in chat and select that line.

#### Scenario: User mentions line number
- **WHEN** user types "Select line 3" or "Tell me about line 1"
- **THEN** the system detects the line number and selects it

#### Scenario: LLM response triggers selection
- **WHEN** user tells LLM to select a line
- **THEN** parsing detects "line X" pattern and sets selected line

### Requirement: Line selection feedback
The system SHALL provide clear feedback when a line is selected.

#### Scenario: Selection confirmation
- **WHEN** user selects a line
- **THEN** system displays "Line 2 selected" or similar confirmation

#### Scenario: Display selected line content
- **WHEN** line is selected
- **THEN** the full line (all moves) is clearly displayed for user reference

