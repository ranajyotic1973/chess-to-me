## ADDED Requirements

### Requirement: Puzzle solve and failure outcomes trigger puzzle points updates
When a puzzle outcome is determined (correct solution submitted or solution revealed / attempt abandoned), the system SHALL call `points:record-solve` IPC with the puzzle's rating and the outcome (`solved: true` or `solved: false`). The IPC response SHALL be used to refresh the profile icon badge in the UI.

#### Scenario: Correct solution triggers points award
- **WHEN** the user submits the correct solution to a puzzle
- **THEN** the renderer SHALL invoke `points:record-solve` with `{ rating: <puzzleRating>, solved: true }` and update the profile badge with the returned points

#### Scenario: Reveal solution triggers points deduction
- **WHEN** the user clicks "Reveal Solution" (abandoning the attempt)
- **THEN** the renderer SHALL invoke `points:record-solve` with `{ rating: <puzzleRating>, solved: false }` and update the profile badge with the returned points

#### Scenario: Points badge updates immediately after outcome
- **WHEN** `points:record-solve` returns a new points value
- **THEN** the profile icon badge SHALL update in the same interaction without requiring a page refresh
