## ADDED Requirements

### Requirement: Position Notes panel is visible alongside the chat area when Advanced Analysis mode is active
When `advancedAnalysisMode` is `true`, the system SHALL render a `<PositionNotesPanel>` component to the right of the chat area. The panel SHALL collapse (not render) when `advancedAnalysisMode` is `false`. The panel width SHALL be fixed at approximately 300 px. The chat area SHALL not shrink when the notes panel is hidden and SHALL share available width with the notes panel when it is visible.

#### Scenario: Notes panel appears when advanced mode is activated
- **WHEN** the user clicks the Advanced Analysis button
- **THEN** the Position Notes panel SHALL appear to the right of the chat area without requiring a page reload

#### Scenario: Notes panel is absent outside advanced mode
- **WHEN** `advancedAnalysisMode` is `false`
- **THEN** no notes panel SHALL be rendered and the chat area SHALL occupy full available width

### Requirement: Position Notes are keyed by the current FEN and loaded automatically
When the current FEN changes (due to a move or navigation), `PositionNotesPanel` SHALL call `notes:get(fen)` via IPC and display the returned note text in the textarea. If no note exists for that FEN, the textarea SHALL be empty. The FEN key SHALL be the full canonical FEN string (including side-to-move, castling rights, en-passant square, and move clocks).

#### Scenario: Existing note is loaded when a known position is reached
- **WHEN** the user makes a move that reaches a FEN for which a note was previously saved
- **THEN** the notes textarea SHALL display the saved note text immediately

#### Scenario: Empty textarea for a new position
- **WHEN** the user navigates to a FEN for which no note exists
- **THEN** the textarea SHALL be empty and ready for input

### Requirement: Position Notes are auto-saved on each keystroke with a 500 ms debounce
When the user types in the notes textarea, `PositionNotesPanel` SHALL debounce the `notes:set(fen, text)` IPC call by 500 ms from the last keystroke. The text SHALL be stored in `userData/chess-to-me/position-notes.json` as a flat `Record<string, string>` map with FEN as key.

#### Scenario: Note is saved after typing stops
- **WHEN** the user types a note and stops typing for 500 ms
- **THEN** `notes:set` SHALL be called with the current FEN and the full note text

#### Scenario: Notes persist across app restarts
- **WHEN** the app is closed and reopened
- **THEN** navigating to the same position SHALL display the previously saved note

### Requirement: Position Notes IPC handlers are exposed in the main process
The main process SHALL register two handlers:
- `notes:get(fen: string) → string | null`: reads `position-notes.json` and returns the note for the given FEN, or `null` if absent.
- `notes:set(fen: string, text: string) → void`: reads `position-notes.json`, sets the value at `fen`, and writes the file back atomically.

Both handlers SHALL initialise the notes file with an empty object `{}` if it does not yet exist and SHALL NOT throw; any I/O error SHALL be logged and the handler SHALL return gracefully.

#### Scenario: notes:get returns null for unknown FEN
- **WHEN** `notes:get` is called with a FEN not present in the notes file
- **THEN** the handler SHALL return `null` without throwing

#### Scenario: notes:set creates the file if absent
- **WHEN** `notes:set` is called and `position-notes.json` does not yet exist
- **THEN** the file SHALL be created containing only the provided FEN-to-text entry

### Requirement: PositionNotesPanel shows a label indicating the current position
The notes panel SHALL display a brief header label such as "Position Notes" and a sub-label showing the first 20 characters of the current FEN (truncated with "…") so the user can confirm which position's notes they are editing.

#### Scenario: FEN label updates on navigation
- **WHEN** the user advances to a new move
- **THEN** the FEN sub-label in the notes panel SHALL update to reflect the new position
