## ADDED Requirements

### Requirement: Track position note modifications
The system SHALL maintain awareness of whether position notes have been modified since entering Advanced Analysis mode.

#### Scenario: Note modification detected
- **WHEN** user edits text in the Position Notes panel
- **THEN** the system marks notes as "modified" internally

#### Scenario: No modification flag on entry
- **WHEN** Advanced Analysis mode is entered
- **THEN** the modification flag is initially set to false

### Requirement: Prompt user on exit if notes modified
When user attempts to exit Advanced Analysis mode with unsaved modified notes, the system SHALL display a dialog prompting whether to save notes.

#### Scenario: Exit Advanced Analysis with modified notes
- **WHEN** user clicks "Stop Analysis" button and position notes are marked as modified
- **THEN** a dialog appears with the message "You have unsaved analysis notes. Save to PGN annotation?" with Save and Discard buttons

#### Scenario: Exit Advanced Analysis without modifications
- **WHEN** user clicks "Stop Analysis" button and no modifications have been made to notes
- **THEN** Advanced Analysis exits immediately without showing a dialog

### Requirement: Save notes as PGN annotation
When user selects "Save" in the notes save prompt, the system SHALL annotate the current PGN with the position notes.

#### Scenario: User clicks Save
- **WHEN** user clicks "Save" button in the notes save dialog
- **THEN** notes are converted to PGN comment format and attached to the appropriate move/position, and Advanced Analysis mode closes

#### Scenario: User clicks Discard
- **WHEN** user clicks "Discard" button in the notes save dialog
- **THEN** notes are discarded without saving, and Advanced Analysis mode closes

### Requirement: PGN annotation format
Saved notes SHALL be added to the PGN using standard PGN comment syntax (text enclosed in curly braces).

#### Scenario: Annotated PGN preserves notes
- **WHEN** notes are saved and the resulting PGN is exported
- **THEN** the PGN contains the notes in valid PGN comment format (e.g., "{ Your analysis notes here }")

### Requirement: Notes are not lost during normal analysis workflow
Position notes entered in Advanced Analysis mode SHALL persist if user navigates between positions without exiting Advanced Analysis.

#### Scenario: Navigate between positions within Advanced Analysis
- **WHEN** user navigates to a different board position while in Advanced Analysis and notes are present
- **THEN** notes are saved for that position and remain accessible if user returns to that position later
