# LLM Line Explanations

The system SHALL format analysis lines with rich metadata and human-readable move descriptions, enabling the LLM to provide detailed strategic and tactical explanations.

## ADDED Requirements

### Requirement: Include line rank in formatted output
The system SHALL include the rank (1st, 2nd, 3rd, etc.) of each analysis line in the formatted output sent to the LLM, indicating relative importance.

#### Scenario: Line rank included
- **WHEN** system formats multiple analysis lines
- **THEN** each line includes its rank (e.g., "Line 1", "Line 2") for LLM to identify primary variations

### Requirement: Include evaluation metadata with each line
The system SHALL include normalized evaluation (with type: centipawn or win probability), numeric value, depth/confidence metric, and engine source for each analysis line.

#### Scenario: Evaluation metadata attached to lines
- **WHEN** system formats an analysis line
- **THEN** output includes "Evaluation: White +0.50 (centipawn, depth 25, Stockfish)" or equivalent

### Requirement: Convert UCI moves to human-readable notation
The system SHALL convert UCI move notation (e.g., "e2e4") to descriptive notation (e.g., "e2-e4" or "pawn to e4") with piece identification.

#### Scenario: Convert piece move
- **WHEN** line includes UCI move "e2e4"
- **THEN** formatted output shows "e2-e4 (pawn advances)" or similar human-readable description

#### Scenario: Convert capture move
- **WHEN** line includes UCI capture "e4d5"
- **THEN** formatted output shows "e4xd5 (pawn captures)" or "knight captures on d5"

### Requirement: Group line metadata and moves logically
The system SHALL format each line with its rank and evaluation at the top, followed by the move sequence with descriptions, creating a clear visual structure for the LLM.

#### Scenario: Structured line format
- **WHEN** system formats an analysis line
- **THEN** output appears as:
  ```
  Line 1 (Best continuation)
  Evaluation: White +0.50 (depth 25)
  1. e2-e4 (pawn to e4) 2. e7-e5 (black responds) 3. g1-f3 (knight develops)
  ```

### Requirement: Include material advantage context in line description
The system SHALL optionally include material balance and positional context (if determinable from the position) alongside the evaluation to help LLM provide richer strategic explanation.

#### Scenario: Material context included
- **WHEN** position shows material imbalance after the line is played
- **THEN** system includes context like "White has rook and two pawns vs. two bishops"
