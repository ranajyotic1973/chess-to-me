## ADDED Requirements

### Requirement: Puzzle points are seeded from the ELO rating of the first successful solve
The puzzle points system SHALL initialise with a value equal to the `rating` field of the first puzzle the user solves successfully. Before any puzzle is solved, points SHALL be in an uninitialised state (`null`). If the puzzle rating is unavailable at seed time, the system SHALL default to 1200.

#### Scenario: First puzzle solved with a known rating
- **WHEN** the user successfully solves their first puzzle and the puzzle has rating 1450
- **THEN** puzzle points SHALL be set to 1450

#### Scenario: First puzzle solved with no rating available
- **WHEN** the user successfully solves their first puzzle and no rating field is present
- **THEN** puzzle points SHALL be seeded to 1200

#### Scenario: Points before any puzzle is solved
- **WHEN** the user has never successfully solved a puzzle
- **THEN** puzzle points SHALL be `null` and the UI SHALL display "—"

### Requirement: Successful puzzle solves award points based on difficulty
After the first solve (i.e. points are no longer `null`), each subsequent successful puzzle solve SHALL add points according to the puzzle's difficulty tier. Difficulty is derived from the puzzle's rating field: below 1200 is easy (+5), 1200–1799 is medium (+10), 1800 and above is hard (+15).

#### Scenario: Solving an easy puzzle awards 5 points
- **WHEN** the user solves a puzzle with rating < 1200
- **THEN** 5 points SHALL be added to the current total

#### Scenario: Solving a medium puzzle awards 10 points
- **WHEN** the user solves a puzzle with rating 1200–1799
- **THEN** 10 points SHALL be added to the current total

#### Scenario: Solving a hard puzzle awards 15 points
- **WHEN** the user solves a puzzle with rating ≥ 1800
- **THEN** 15 points SHALL be added to the current total

### Requirement: Failed puzzle attempts deduct 25 points with a floor of zero
Each failed puzzle attempt (user gives up or reveals solution) SHALL deduct 25 points from the current total. Points SHALL NOT go below zero. Once the total reaches zero after the seeding event, a `frozenAtZero` flag SHALL be set. While `frozenAtZero` is true, further failures SHALL NOT deduct points, but successful solves SHALL still add points normally.

#### Scenario: Failure deducts 25 points
- **WHEN** the user fails a puzzle and current points are 80
- **THEN** points SHALL become 55

#### Scenario: Failure does not go below zero
- **WHEN** the user fails a puzzle and current points are 10
- **THEN** points SHALL become 0 and `frozenAtZero` SHALL be set to true

#### Scenario: Further failures when frozen at zero do not deduct
- **WHEN** `frozenAtZero` is true and the user fails another puzzle
- **THEN** points SHALL remain at the current value (0 or higher if solves occurred since freezing)

#### Scenario: Successful solve after frozenAtZero still awards points
- **WHEN** `frozenAtZero` is true and the user solves a medium puzzle
- **THEN** 10 points SHALL be added and the total SHALL be 10

### Requirement: Puzzle points are persisted in a dedicated file beside the settings file
Puzzle points SHALL be stored in a file named `puzzle-points.json` in the same directory as the application settings file (`app.getPath("userData")`). The file SHALL contain at minimum `{ "points": number | null, "frozenAtZero": boolean }`. The file SHALL be written after every change to the points value.

#### Scenario: File is created on first solve
- **WHEN** the user solves their first puzzle
- **THEN** `puzzle-points.json` SHALL be created in the userData directory with the seeded points value

#### Scenario: File reflects latest points after each solve
- **WHEN** the user solves a puzzle and points are updated
- **THEN** reading `puzzle-points.json` immediately afterwards SHALL return the updated value

#### Scenario: File is read on application start
- **WHEN** the application starts and `puzzle-points.json` exists
- **THEN** the in-memory points value SHALL be initialised from the file

### Requirement: In-memory points survive accidental file deletion at runtime
The main process SHALL maintain an in-memory copy of the current points value at all times. If `puzzle-points.json` is deleted while the application is running, the next points write event SHALL recreate the file using the in-memory value. No points SHALL be lost as a result of file deletion during a session.

#### Scenario: File deleted during session, then points updated
- **WHEN** `puzzle-points.json` is deleted while the app is running and the user subsequently solves a puzzle
- **THEN** the file SHALL be recreated with the correct updated points value

#### Scenario: File deleted during session, app reads points
- **WHEN** `puzzle-points.json` is deleted while the app is running and the UI requests the current points
- **THEN** the in-memory value SHALL be returned and the UI SHALL display the correct points
