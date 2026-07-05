## ADDED Requirements

### Requirement: Novelty is determined from the games database
A candidate engine move for a position SHALL be classified as "novel" when it is rarely or never played from that position in the imported games database (below a configured frequency threshold) AND the line remains engine-approved (its evaluation is within a configured threshold of the best line). A move that is common in the games database for the position SHALL NOT be novel, and an out-of-database move whose evaluation is worse than the threshold SHALL NOT be novel.

#### Scenario: Out-of-database, engine-approved move is novel
- **WHEN** an engine line's first move is below the frequency threshold in the games database for the current position and its evaluation is within the novelty threshold of the best line
- **THEN** the line SHALL be classified as novel

#### Scenario: Common book move is not novel
- **WHEN** an engine line's first move is played frequently from the position in the games database
- **THEN** the line SHALL NOT be classified as novel

#### Scenario: Out-of-database but unsound move is not novel
- **WHEN** an out-of-database move's evaluation is worse than the novelty threshold relative to the best line
- **THEN** the line SHALL NOT be classified as novel

### Requirement: An opening-line index is derived from the games database and persisted
The system SHALL build and persist an opening-line index derived from the imported games database, so novelty lookups during analysis are fast and do not scan the full games database each time. The index SHALL record, for each game's opening (up to a bounded ply depth), every move-prefix as a stable hash mapped to the number of games that followed that exact line, and MAY record the ECO code/name of the opening reached. A candidate line's frequency SHALL be obtained by hashing the moves played to reach the position plus the candidate's first move and looking that hash up, rather than walking the games move-by-move.

#### Scenario: Index is queried during analysis
- **WHEN** novelty is evaluated for a candidate line whose move-prefix exists in the index
- **THEN** the classification SHALL use the persisted line-prefix frequency (a single hash lookup) rather than a full games-database scan

#### Scenario: Index persists across sessions
- **WHEN** the opening-line index has been built and the app is restarted
- **THEN** novelty lookups SHALL work without rebuilding the index

#### Scenario: Novelty is limited to the opening window
- **WHEN** the moves played to reach the position exceed the indexed ply depth
- **THEN** no line SHALL be classified as novel

### Requirement: The opening-line index is built without blocking the UI when needed
Novelty detection SHALL require an imported games database. When a games database is present but its opening-line index has not yet been built (or is stale relative to the games count), the system SHALL build the index without blocking the UI — committing work in small batches and yielding control to the event loop between them — and SHALL report its progress via the status bar like other background jobs. When no games database is imported, novelty detection SHALL be unavailable and no novelty icons SHALL be shown.

#### Scenario: Index build starts for an unindexed database
- **WHEN** a games database is imported but not yet indexed for novelty
- **THEN** the system SHALL start building the opening-line index and its progress SHALL appear in the status bar

#### Scenario: Novelty unavailable without a games database
- **WHEN** no games database has been imported
- **THEN** novelty detection SHALL be skipped and no line SHALL show a novelty icon

#### Scenario: UI stays responsive during indexing
- **WHEN** the background novelty-index job is running
- **THEN** analysis and other interactions SHALL remain usable

### Requirement: Novel lines are flagged with an icon in the analysis list
Lines classified as novel SHALL be rendered in the analysis list with a small, relevant icon; non-novel lines SHALL NOT show the icon. This applies wherever engine lines are listed in Deep Analysis, Opening, Middlegame, and Endgame modes.

#### Scenario: Novel line shows the icon
- **WHEN** a listed engine line is classified as novel
- **THEN** that line row SHALL display the novelty icon

#### Scenario: Non-novel line has no icon
- **WHEN** a listed engine line is not classified as novel
- **THEN** that line row SHALL NOT display the novelty icon
