## 1. Component Creation

- [x] 1.1 Create `src/components/AIImportDialog.tsx` for "Do you want to copy AI notes?" popup with Yes/No buttons
- [x] 1.2 Create `src/components/NoteEditorPopup.tsx` for markdown editor popup with formatting toolbar
- [x] 1.3 Add markdown editor library dependency (react-markdown already present — used for live preview)
- [x] 1.4 Implement formatting toolbar in editor (bold, italic, heading, list, link, code, blockquote buttons)
- [x] 1.5 Add Save and Cancel icon buttons to note editor popup

## 2. Data Model Updates

- [x] 2.1 Add `moveNotes` (move index → markdown string) state in App, passed to SelectedLineDetail
- [x] 2.2 Add `noteEditMoveIndex` state to track which move's note is being edited
- [x] 2.3 Reset notes on board reset; notes are keyed by move index within the played line

## 3. UI Integration in SelectedLineDetail

- [x] 3.1 Add visual indicator bar on top of moves that have notes
- [x] 3.2 Add click handler to moves that triggers note editing workflow
- [x] 3.3 Add "Click on any move to write notes" hint text above line details (only in advanced analysis mode)
- [x] 3.4 Connect AIImportDialog → NoteEditorPopup workflow

## 4. Note Editor Logic

- [x] 4.1 When move clicked without notes: show AIImportDialog asking about copying AI notes
- [x] 4.2 If user says Yes: pre-fill editor with LLM response and a blank line at top, cursor at start
- [x] 4.3 If user says No: open editor empty and ready for input
- [x] 4.4 When move clicked with existing notes: open editor directly showing the note (skip AIImportDialog)
- [x] 4.5 Implement Save button to store markdown note to the move and close popup
- [x] 4.6 Implement Cancel button to discard changes and close popup

## 5. Advanced Analysis Panel Updates

- [x] 5.1 Remove the old Notes panel component completely (PositionNotesPanel deleted)
- [x] 5.2 Remove notes-related state variables and callbacks (currentNotesMap, notesModified, confirm dialog)
- [x] 5.3 Add Save button to advanced analysis mode that opens file save dialog
- [x] 5.4 Implement PGN export function that converts line details with notes to PGN format

## 6. PGN Export Implementation

- [x] 6.1 Create utility function to extract moves with notes from line details (`src/utils/pgnNotes.ts`)
- [x] 6.2 Implement PGN generator that embeds notes in move comments using `{markdown}` format
- [x] 6.3 Create file save dialog handler that restricts file extension to .pgn only (`analysis:export-pgn`)
- [ ] 6.4 Test PGN export/import roundtrip with common chess software (manual)

## 7. Testing and Verification

- [ ] 7.1 Test: Click move without notes → AIImportDialog appears (manual)
- [ ] 7.2 Test: Click Yes in dialog → editor shows AI analysis with blank line and cursor at top (manual)
- [ ] 7.3 Test: Click No in dialog → editor appears empty (manual)
- [ ] 7.4 Test: Click move with existing notes → editor shows notes directly without dialog (manual)
- [ ] 7.5 Test: Markdown formatting buttons insert proper syntax in editor (manual)
- [ ] 7.6 Test: Save button persists note to move and displays indicator bar (manual)
- [ ] 7.7 Test: Cancel button discards unsaved changes (manual)
- [ ] 7.8 Test: Moves with notes show visual indicator bar (manual)
- [ ] 7.9 Test: Hint text "Click on any move to write notes" appears in advanced analysis mode only (manual)
- [ ] 7.10 Test: PGN export includes all notes in proper format (manual)
- [ ] 7.11 Test: File save dialog enforces .pgn extension (manual)
- [x] 7.12 Run `npm test` — 551 pass, +11 new pgnNotes tests (1 pre-existing redux failure unrelated)
- [x] 7.13 Run `npm run build` to verify no TypeScript errors

## 8. Cleanup

- [x] 8.1 Remove old Notes panel styles (component deleted)
- [x] 8.2 No notes-specific Redux actions/reducers existed to remove
- [x] 8.3 Verify no orphaned imports or unused note-related code
- [x] 8.4 Advanced analysis notes behaviour documented via specs/design in this change
