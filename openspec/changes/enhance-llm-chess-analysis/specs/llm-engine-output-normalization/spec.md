# LLM Engine Output Normalization

The system SHALL convert engine-specific output formats (Stockfish, LC0) into a unified, normalized representation before sending to the LLM, handling differences in evaluation types and metrics.

## ADDED Requirements

### Requirement: Normalize Stockfish centipawn evaluations
The system SHALL convert Stockfish centipawn scores to a normalized advantage scale with evaluation confidence based on search depth.

#### Scenario: Convert positive Stockfish evaluation
- **WHEN** Stockfish returns evaluation of +150 centipawns at depth 25
- **THEN** system normalizes to "White is slightly better (cp +1.50, depth 25)"

#### Scenario: Convert negative Stockfish evaluation  
- **WHEN** Stockfish returns evaluation of -75 centipawns at depth 20
- **THEN** system normalizes to "Black is slightly better (cp -0.75, depth 20)"

### Requirement: Normalize LC0 win probability evaluations
The system SHALL convert LC0 win probability outputs (0-100 scale) to normalized advantage descriptors comparable to centipawn scales.

#### Scenario: Convert LC0 winning position
- **WHEN** LC0 returns win probability of 75% (white winning) at neural network depth
- **THEN** system normalizes to "White is clearly better (win prob 75%, neural depth)"

#### Scenario: Convert LC0 drawn position
- **WHEN** LC0 returns win probability near 50% indicating balanced position
- **THEN** system normalizes to "Position is balanced (win prob ~50%, neural depth)"

### Requirement: Include standardized metadata with normalized evaluations
The system SHALL attach metadata to each normalized evaluation: evaluation type (centipawn or win probability), depth/confidence metric, and engine source.

#### Scenario: Normalized evaluation includes metadata
- **WHEN** system normalizes any engine evaluation
- **THEN** output includes source engine, evaluation type, numeric value, and depth/confidence

### Requirement: Preserve move sequences during normalization
The system SHALL maintain the complete PV (principal variation) line as UCI moves while normalizing the accompanying evaluation, ensuring LLM receives both raw move data and normalized context.

#### Scenario: Line normalization preserves moves
- **WHEN** system receives PV line "e2e4 e7e5 g1f3" with evaluation
- **THEN** normalized output includes the complete move sequence unchanged alongside normalized evaluation
