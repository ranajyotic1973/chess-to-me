## ADDED Requirements

### Requirement: Analysis modal displays moves played and current position analysis
The analysis modal SHALL display the moves that have been played in the selected line alongside the LLM's analysis of the current board position. The modal SHALL render as a full-screen or large overlay container that covers the chat panel area.

#### Scenario: Modal shows moves played and LLM analysis
- **WHEN** the user has made at least 3 moves in a selected line and an LLM analysis response is available
- **THEN** the analysis modal SHALL display the sequence of moves played (e.g., "1.e4 c5 2.Nf3 d6") and the complete LLM analysis text beneath it

### Requirement: Analysis modal appears after the third move in a line
The analysis modal SHALL be hidden initially and become visible only after the user navigates to or plays the third move or later in the selected line.

#### Scenario: Modal appears at move 3
- **WHEN** the user is viewing move 3 or later in a selected line and LLM analysis has been generated
- **THEN** the analysis modal SHALL be displayed automatically

#### Scenario: Modal remains hidden before move 3
- **WHEN** the user is viewing moves 1 or 2 in a selected line
- **THEN** the analysis modal SHALL remain hidden, and only the lines list and chat interface SHALL be visible

### Requirement: User can close the analysis modal with an X button
The analysis modal SHALL include a close button (X icon) in its header that allows the user to dismiss the modal and return to viewing the lines list and chat interface.

#### Scenario: Closing the modal returns to chat view
- **WHEN** the user clicks the X button on the analysis modal
- **THEN** the modal SHALL be hidden and the user SHALL see the lines list, moves played, and chat interface again

### Requirement: Icon button allows reopening the analysis modal
A small icon button SHALL be visible in the chat panel area (when the modal is closed) that allows the user to reopen the analysis modal to view the moves played and LLM analysis again.

#### Scenario: Icon button reopens the modal
- **WHEN** the user clicks the reopen icon button while the modal is closed and analysis data is available
- **THEN** the analysis modal SHALL be displayed again showing the current moves played and LLM analysis

### Requirement: Chat conversation remains visible and functional
The chat conversation interface SHALL remain visible and fully functional regardless of whether the analysis modal is open or closed. Chat messages and the input field SHALL NOT be affected by the modal's state.

#### Scenario: Chat remains accessible with modal open
- **WHEN** the analysis modal is open
- **THEN** the user SHALL still be able to see previous chat messages and type new messages; the chat interface SHALL continue to function normally
