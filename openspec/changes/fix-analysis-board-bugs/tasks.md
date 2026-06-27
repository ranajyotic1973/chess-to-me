## 1. Setup and State Management

- [x] 1.1 Add `notationFormat` state to App.tsx (default: "san")
- [x] 1.2 Add `advancedAnalysisNotesModified` state to track note changes
- [x] 1.3 Add `currentRawPgn` state for real-time PGN tracking
- [x] 1.4 Create interface for notation format constants (SAN, UCI)

## 2. Notation Display Control

- [x] 2.1 Update `parseStockfishLine()` in analysisHelpers.ts to generate both SAN and UCI move sequences
- [x] 2.2 Add `uciDescription` field to AnalysisEntry type definition
- [x] 2.3 Add notation format toggle button to ChatPanel with SAN/UCI labels
- [x] 2.4 Update SelectableList item display to show moves in selected notation format
- [x] 2.5 Add move display logic to conditionally render description vs uciDescription based on `notationFormat` state
- [x] 2.6 Persist notation format preference to localStorage for session consistency

## 3. Board Sizing and Advanced Analysis Layout

- [x] 3.1 Modify `boardSize` calculation in App.tsx to reduce width when `advancedAnalysisMode === true`
- [x] 3.2 Update board width from 60% to 40% of usable space when in advanced analysis
- [ ] 3.3 Ensure responsive behavior on narrow screens (<1024px) - may stack or hide panels
- [ ] 3.4 Test board resizing on window resize events while in advanced mode
- [ ] 3.5 Verify chat panel (min 320px) and notes panel (280-320px) remain visible on wide screens

## 4. Legal Move Validation and Piece Interaction

- [ ] 4.1 Review chessboard.js drag-drop configuration in AnalysisBoard.tsx
- [ ] 4.2 Ensure `onDrop` handler properly validates moves using chess.js
- [ ] 4.3 Verify snapback behavior works correctly for illegal moves
- [ ] 4.4 Add `onDragStart` validation to prevent dragging non-active player's pieces
- [ ] 4.5 Test pawn promotion dialog appears and correctly handles promotion selection
- [ ] 4.6 Test check legality validation (cannot move into check or leave king in check)
- [ ] 4.7 Verify draggable is set to false in puzzle mode and true in analysis mode

## 5. Real-Time PGN Tracking

- [x] 5.1 Update `currentRawPgn` state on each forward move in `onDrop` and keyboard navigation
- [x] 5.2 Update `currentRawPgn` on backward moves (arrow key retreat)
- [x] 5.3 Use chess.js's `.pgn()` method to generate canonical PGN format
- [x] 5.4 Add PGN reset when board is reset to start position
- [ ] 5.5 Test PGN accuracy after forward and backward navigation
- [ ] 5.6 Verify PGN remains valid and parseable after any move sequence

## 6. Position Notes Persistence and Save Prompt

- [x] 6.1 Add `advancedAnalysisNotesModified` flag update to PositionNotesPanel's `handleChange` callback
- [x] 6.2 Create NotesConfirmDialog component with "Save to PGN" and "Discard" options
- [x] 6.3 Add logic to show dialog when exiting advanced mode if notes are modified
- [x] 6.4 Implement notes-to-PGN annotation conversion using PGN comment syntax (curly braces)
- [x] 6.5 Update electronAPI call to save annotated PGN when user clicks Save
- [x] 6.6 Reset modification flag when exiting advanced mode
- [ ] 6.7 Test dialog appears/disappears appropriately based on modification state

## 7. Analysis Line Selection Control

- [x] 7.1 Delete `detectLineNumberInText()` calls at lines ~2227-2246 in App.tsx
- [x] 7.2 Remove auto-detection logic for question text line mentions
- [x] 7.3 Remove auto-detection logic for LLM response line mentions
- [x] 7.4 Remove automatic `setSelectedEngineLineIndex()` and `setSelectedEngineLineData()` calls
- [ ] 7.5 Verify SelectableList still allows manual line selection via click
- [ ] 7.6 Verify keyboard shortcut (typing 1-4) still selects lines manually
- [ ] 7.7 Confirm no moves auto-play on board when LLM mentions a line

## 8. Testing and Verification

- [ ] 8.1 Test notation toggle: SAN → UCI → SAN transitions smoothly
- [ ] 8.2 Test SAN display includes piece glyphs (♘, ♗, etc.)
- [ ] 8.3 Test UCI display shows moves as e2e4, c7c5 format
- [ ] 8.4 Test board resizes correctly entering/exiting Advanced Analysis on 1024px+ screens
- [ ] 8.5 Test narrow screen behavior (<1024px) doesn't break layout
- [ ] 8.6 Test illegal move attempts (moving opponent piece, moving into check, invalid pawn move)
- [ ] 8.7 Test pawn promotion dialog appears and works correctly
- [ ] 8.8 Test PGN accuracy with multiple forward/backward navigations
- [ ] 8.9 Test position notes save prompt appears only when modified
- [ ] 8.10 Test annotated PGN contains notes in curly braces format
- [ ] 8.11 Test LLM response mentioning "line 1" does NOT auto-select or auto-play
- [ ] 8.12 Test manual line selection still works (clicking or typing number)
- [ ] 8.13 Test snapback animation on rejected moves
- [ ] 8.14 Test turn order enforcement (cannot move opponent pieces)
- [ ] 8.15 Run existing test suite to verify no regressions

## 9. Documentation and Clean-up

- [ ] 9.1 Update CLAUDE.md project rules if notation/PGN behavior changes user-facing APIs
- [ ] 9.2 Add inline comments to complex notation conversion logic in analysisHelpers.ts
- [ ] 9.3 Document new state variables (notationFormat, advancedAnalysisNotesModified, currentRawPgn)
- [ ] 9.4 Verify all child-appropriate language (error messages, UI labels)
- [ ] 9.5 Remove or consolidate any debug console logs added during development
