## ADDED Requirements

### Requirement: Export analyzed lines to PGN with notes
When user clicks save in advanced analysis mode, a file save dialog SHALL open allowing the user to choose a filename with .pgn extension. The exported file SHALL contain the moves from line details with any associated notes embedded as markdown.

#### Scenario: Save button opens file dialog
- **WHEN** user clicks the save button in advanced analysis mode
- **THEN** a file save dialog SHALL open allowing the user to enter a filename

#### Scenario: File is saved as PGN format
- **WHEN** user enters a filename and confirms the save dialog
- **THEN** the file SHALL be saved with .pgn extension and contain the moves and notes in PGN format

#### Scenario: Notes are embedded in PGN output
- **WHEN** the PGN file is created from line details with notes
- **THEN** each move with notes SHALL include the markdown notes in the move annotation field (using standard PGN comment syntax)

#### Scenario: File dialog enforces PGN extension
- **WHEN** the file save dialog is open
- **THEN** the file extension SHALL be restricted to .pgn only (user cannot select other formats)
