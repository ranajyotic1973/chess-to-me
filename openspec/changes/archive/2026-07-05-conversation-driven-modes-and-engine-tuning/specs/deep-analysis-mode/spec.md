## ADDED Requirements

### Requirement: Deep Analysis surfaces at least ten lines and flags novel ones
When Deep (Advanced) Analysis mode runs, the engine SHALL be configured to return at least 10 principal variations when that many legal lines exist (per the engine-mode-tuning capability), and lines that are novel (per the novelty-line-detection capability) SHALL be rendered with the novelty icon in the analysis list.

#### Scenario: Deep analysis returns ten or more lines
- **WHEN** Deep Analysis runs on a rich middlegame position
- **THEN** the analysis list SHALL contain at least 10 lines (or all legal lines if fewer than 10 exist)

#### Scenario: Novel deep-analysis line shows the icon
- **WHEN** one of the deep-analysis lines qualifies as novel
- **THEN** that line SHALL display the novelty icon in the analysis list
