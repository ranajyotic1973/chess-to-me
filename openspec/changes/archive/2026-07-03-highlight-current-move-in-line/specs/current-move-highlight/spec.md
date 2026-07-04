# Capability: Current Move Highlight

## Overview

The system SHALL display visual indicators for the current move position when a user is navigating through a selected engine analysis line. The current move is highlighted with bold text and a small yellow square indicator that dynamically updates as the user navigates forward or backward through the line's moves.

## ADDED Requirements

### Requirement: Display highlighted current move in line detail
The system SHALL render the move notation in the line detail box with the current move position visually distinguished from other moves in the line.

#### Scenario: User navigates to move 2 in a line
- **WHEN** a line is selected and the user presses the right arrow key to advance to move 2
- **THEN** the move notation for move 2 is displayed in bold text

#### Scenario: Yellow square indicator appears at current move
- **WHEN** a line is selected and currentMoveIndex is set to any valid move position
- **THEN** a small yellow square appears visually positioned at that move in the notation string

#### Scenario: Indicator moves with navigation
- **WHEN** a user navigates backward or forward through line moves using arrow keys
- **THEN** the yellow square indicator moves to the new current move position, and the move text becomes bold

### Requirement: Update highlight when move is made on board
The system SHALL update the current move highlight when the user makes a move via drag-and-drop or keyboard input on the chessboard while a line is selected.

#### Scenario: User plays first move on board
- **WHEN** a line is selected (e.g., "1. e4 e5 2. ♘f3...") and user plays the first move on the board
- **THEN** the move notation updates to show the highlight and yellow square at move 1

#### Scenario: User plays off-book move
- **WHEN** a line is selected and user plays a move that doesn't match the line
- **THEN** the line deselects automatically and highlight is removed

### Requirement: Highlight only appears in non-puzzle modes
The system SHALL display the current move highlight in all analysis and game modes EXCEPT puzzle mode.

#### Scenario: Highlight shown in analysis mode
- **WHEN** a user is in analysis mode and selects an engine line
- **THEN** the current move highlight is displayed and updates with navigation

#### Scenario: Highlight hidden in puzzle mode
- **WHEN** a user is in puzzle mode and a solution line is displayed
- **THEN** no current move highlight is shown (normal puzzle flow applies)

#### Scenario: Highlight shown in deep analysis mode
- **WHEN** a user is in deep analysis mode with advanced analysis active
- **THEN** the current move highlight is displayed alongside other line details

### Requirement: Highlight styling is visually clear
The system SHALL use bold text and a yellow square indicator that is clearly distinct and easy to track.

#### Scenario: Bold text distinguishes current move
- **WHEN** notation is rendered with the current move at position 3 (e.g., "1. e4 e5 **2. ♘f3**...")
- **THEN** the move text is visually bold and noticeably darker than surrounding moves

#### Scenario: Yellow square is visible and correctly positioned
- **WHEN** the yellow square indicator is displayed
- **THEN** it is small enough not to obscure text but large enough to be clearly visible against the background
- **AND** it is positioned immediately before or after the highlighted move notation

### Requirement: Highlight updates in real-time with navigation
The system SHALL update the highlight immediately when the user navigates using keyboard arrows or makes moves on the board, with no perceptible delay.

#### Scenario: Fast arrow key navigation updates highlight
- **WHEN** user rapidly presses arrow keys to navigate through a line
- **THEN** the highlight and yellow square move smoothly and immediately to each new position

#### Scenario: Multiple consecutive moves update correctly
- **WHEN** user makes multiple consecutive moves on the board while a line is selected
- **THEN** each move updates the highlight position correctly until a non-matching move is played
