## ADDED Requirements

### Requirement: Save Analysis icon button is visible only in Advanced Analysis mode
A Save Analysis icon button (save/floppy-disk icon, tooltip "Save this analysis") SHALL be rendered in the same toolbar row as the Advanced Analysis button, immediately to its right. The button SHALL only be visible when `advancedAnalysisMode` is `true`. It SHALL be disabled while engine analysis or deep LLM analysis is in progress.

#### Scenario: Save button appears when advanced mode is active
- **WHEN** `advancedAnalysisMode` is `true`
- **THEN** the Save Analysis icon button SHALL be visible in the toolbar

#### Scenario: Save button is absent outside advanced mode
- **WHEN** `advancedAnalysisMode` is `false`
- **THEN** no Save Analysis button SHALL be rendered

### Requirement: Load Analysis icon button is always visible in the analysis toolbar
A Load Analysis icon button (folder-open icon, tooltip "Load saved analysis") SHALL be rendered in the same toolbar row as the Advanced Analysis button, to the right of the Save button. It SHALL be visible regardless of whether `advancedAnalysisMode` is `true` or `false`.

#### Scenario: Load button is always present in the analysis view
- **WHEN** the user is in the default analysis view (`gameMode` is falsy)
- **THEN** the Load Analysis button SHALL be visible in the toolbar

### Requirement: Save Analysis writes a PGN file to the settings directory with a timestamped name
Clicking Save Analysis SHALL invoke the `analysis:save-pgn` IPC handler with `{ pgn: string, notes: Record<string, string> }`. The main process SHALL:
1. Format the current date-time as `dd-mm-yyyy_hh` (zero-padded, local time, hours only).
2. Write the file to `<userData>/chess-to-me/analysis-<dd-mm-yyyy_hh>.pgn`.
3. Append a custom `[Notes]` tag containing the JSON-encoded notes map at the end of the PGN string before writing.
4. Return `{ ok: true, path: string }` on success, or `{ ok: false, error: string }` on failure.

#### Scenario: File is saved with the correct timestamped name
- **WHEN** the user clicks Save Analysis at 14:37 on 15 June 2026
- **THEN** the file SHALL be saved as `analysis-15-06-2026_14.pgn` in `<userData>/chess-to-me/`

#### Scenario: Notes are embedded in the saved PGN
- **WHEN** the PGN is saved and position notes exist
- **THEN** the file SHALL contain a `[Notes]` tag with the JSON-encoded `{ fen → text }` map appended after the standard PGN content

#### Scenario: Save fails gracefully
- **WHEN** the file system write fails (e.g., disk full)
- **THEN** the handler SHALL return `{ ok: false, error: "<message>" }` and the renderer SHALL display an error Snackbar

### Requirement: A Snackbar toast confirms a successful save and shows the file path
After a successful `analysis:save-pgn` call, the renderer SHALL trigger the existing Snackbar mechanism with severity "success" and the message: "Analysis saved to: <full file path>".

#### Scenario: Success toast shows full path
- **WHEN** the save succeeds and the file is written to `C:\Users\alice\AppData\...\chess-to-me\analysis-15-06-2026_14.pgn`
- **THEN** the Snackbar SHALL display "Analysis saved to: C:\Users\alice\AppData\...\chess-to-me\analysis-15-06-2026_14.pgn" with a success severity

### Requirement: Load Analysis opens an Electron dialog and loads the chosen PGN onto the board
Clicking Load Analysis SHALL invoke the `analysis:load-pgn` IPC handler. The main process SHALL open an Electron `dialog.showOpenDialog` filtered to `*.pgn` files. If the user selects a file, the handler SHALL:
1. Read the file contents.
2. Extract the `[Notes]` tag JSON map from the end of the PGN (if present) and return it as the `notes` field.
3. Return the remaining PGN string (with the `[Notes]` tag stripped) as the `pgn` field.
4. Return `{ ok: true, pgn: string, notes: Record<string, string> }`.

The renderer SHALL apply the returned PGN to the board using `chess.js`, set `currentFen` to the final position, and merge the returned notes into the live position-notes store.

#### Scenario: User selects a valid PGN file
- **WHEN** the user clicks Load Analysis and selects a `.pgn` file saved by the app
- **THEN** the board SHALL load the PGN game, the notes embedded in the file SHALL become available for the positions in the game, and the position notes panel SHALL display the note for the current FEN

#### Scenario: User cancels the file dialog
- **WHEN** the user opens the file dialog and presses Cancel
- **THEN** the handler SHALL return `{ ok: false, cancelled: true }` and no board change SHALL occur

#### Scenario: PGN file without a Notes tag is loaded
- **WHEN** the user loads a standard PGN file not saved by this app
- **THEN** the PGN SHALL be applied to the board with an empty `notes` map; existing position notes in the live store SHALL be unaffected
