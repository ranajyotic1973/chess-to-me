## ADDED Requirements

### Requirement: Display analysis lines in selected notation format
The system SHALL display chess analysis lines in either Standard Algebraic Notation (SAN) or Universal Chess Interface (UCI) format based on user selection. The notation format toggle SHALL be accessible from the analysis UI.

#### Scenario: Display line in SAN format
- **WHEN** notation format is set to "SAN" and an analysis line is displayed
- **THEN** the line shows moves in Standard Algebraic Notation (e.g., "1. e4 c5 2. Nf3 d6 3. d4 cxd4")

#### Scenario: Display line in UCI format
- **WHEN** notation format is set to "UCI" and an analysis line is displayed
- **THEN** the line shows moves in Universal Chess Interface format (e.g., "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4")

#### Scenario: Toggle notation format
- **WHEN** user clicks the notation format toggle button
- **THEN** the notation format switches between SAN and UCI, and all displayed lines update to the new format immediately

### Requirement: Format lines with piece glyphs in SAN notation
When displaying in SAN format, the system SHALL render piece glyphs (♙, ♘, ♗, etc.) for clarity in the analysis interface.

#### Scenario: SAN line includes piece glyphs
- **WHEN** notation format is SAN and a line contains non-pawn moves
- **THEN** piece symbols are rendered with glyphs (e.g., "♘f3" instead of "Nf3")

### Requirement: Both formats maintain move accuracy
The system SHALL ensure that SAN and UCI representations of the same line are equivalent and produce identical board positions when replayed.

#### Scenario: Formats represent same moves
- **WHEN** a line is displayed in both SAN and UCI formats
- **THEN** replaying the line produces the identical final board position regardless of format

### Requirement: Default notation format
The system SHALL default to SAN notation format on application startup.

#### Scenario: Initial load shows SAN format
- **WHEN** application loads and first analysis line is displayed
- **THEN** the line is shown in SAN notation by default
