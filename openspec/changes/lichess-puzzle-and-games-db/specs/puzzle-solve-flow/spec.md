## ADDED Requirements

### Requirement: Puzzle request queries local database before invoking LLM generation
When `handlePuzzleRequest` is called and a local puzzle DB is available, the system SHALL first extract structured search parameters from the user's question (via LLM intent extraction or regex heuristics), query `puzzles.db`, and use the returned puzzle row as the source of truth. If the DB returns no match or no DB is present, the system SHALL fall back to LLM-generated puzzle (current behavior).

#### Scenario: DB returns a matching puzzle
- **WHEN** the user asks for a puzzle (e.g., "Give me a fork puzzle around 1800 rating") and the DB contains a matching puzzle
- **THEN** `handlePuzzleRequest` SHALL NOT call the LLM for puzzle generation; instead it SHALL use the DB row's `fen`, `moves`, `themes`, and `opening_tags` as the puzzle content

#### Scenario: DB returns no match
- **WHEN** the user asks for a puzzle with criteria that yield zero results in `puzzles.db`
- **THEN** `handlePuzzleRequest` SHALL fall back to LLM generation exactly as it does today, with no user-visible indication of the fallback

#### Scenario: Puzzle DB is not installed
- **WHEN** `puzzles.db` does not exist on the user's machine
- **THEN** `handlePuzzleRequest` SHALL behave identically to its current behavior (LLM generates puzzle)

### Requirement: LLM is invoked to present and explain a database-sourced puzzle
When a puzzle row is sourced from the DB, the system SHALL call the LLM with the puzzle data (FEN, moves in UCI, themes, opening) injected into the prompt context. The LLM SHALL produce the story introduction and move-by-move walkthrough explanation. The JSON response format (including `fen`, `solution`, `explanation`, `hidden_solution`) SHALL be identical to the LLM-generated puzzle format so downstream puzzle state management is unaffected.

#### Scenario: LLM wraps DB puzzle in a narrative
- **WHEN** a DB puzzle is found and the LLM is called to present it
- **THEN** the LLM response SHALL include `response_type: "Puzzle"`, the original `fen` from the DB row, the original `moves` array as `solution`, a natural-language `explanation` with story + walkthrough, and `hidden_solution: true`

#### Scenario: LLM presentation call fails
- **WHEN** the LLM call for puzzle presentation returns an error
- **THEN** the system SHALL display an error message in the chat area and SHALL NOT corrupt `puzzleSolution` or `puzzleStartFen` state
