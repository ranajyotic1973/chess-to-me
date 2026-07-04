## ADDED Requirements

### Requirement: User can click on moves to write notes
Users in advanced analysis mode SHALL be able to click on any move in the line details to open a notes editor popup. Notes are stored as markdown per move.

#### Scenario: First click on move without notes shows AI import dialog
- **WHEN** user clicks on a move in line details that has no existing notes
- **THEN** a dialog SHALL appear asking "Do you want to copy the AI notes in your notes?" with Yes/No buttons

#### Scenario: AI import dialog leads to note editor
- **WHEN** user answers Yes or No in the AI import dialog
- **THEN** the note editor popup SHALL appear with an empty editor (No) or pre-filled with AI analysis (Yes)

#### Scenario: Click on move with existing notes opens editor directly
- **WHEN** user clicks on a move in line details that already has notes
- **THEN** the note editor popup SHALL appear directly showing the existing note, without the AI import dialog

### Requirement: Line details shows hint text for notes feature
When advanced analysis mode is active, a hint text SHALL appear above the line details box instructing users to click moves to write notes.

#### Scenario: Hint text displayed in advanced analysis mode
- **WHEN** advanced analysis mode is active
- **THEN** text "Click on any move to write notes" SHALL appear above the line details box

### Requirement: Visual indicator for moves with notes
Moves that have notes SHALL display a small bar indicator on top of the move to show it has associated notes.

#### Scenario: Noted move displays indicator
- **WHEN** a move in line details has stored notes
- **THEN** a small visual bar SHALL appear on top of that move label
