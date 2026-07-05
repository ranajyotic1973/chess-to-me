## ADDED Requirements

### Requirement: Selected-line moves control lists the full move sequence of the selected engine line
The analysis panel SHALL render a control, labelled "Moves of selected line", that displays every move of the currently selected engine line (its principal variation) in SAN notation with move numbers. The control SHALL mirror the visual styling of the existing "Moves Played" control. When no engine line is selected, the control SHALL NOT be shown.

#### Scenario: A line is selected
- **WHEN** the user selects an engine line whose principal variation is `e2e4 e7e5 g1f3`
- **THEN** the "Moves of selected line" control SHALL appear and display the moves as `1. e4 e5 2. Nf3`

#### Scenario: Selection changes
- **WHEN** the user switches from one selected line to another
- **THEN** the control SHALL update to show the newly selected line's moves and SHALL NOT retain the previous line's moves

#### Scenario: No line selected
- **WHEN** no engine line is currently selected
- **THEN** the "Moves of selected line" control SHALL NOT be rendered

### Requirement: Selected-line moves control degrades gracefully on unparseable moves
The control SHALL derive SAN from the selected line's moves and, if a move cannot be converted to SAN (for example the line data is out of sync with the base position), SHALL fall back to displaying the raw move token rather than crashing.

#### Scenario: A move token cannot be converted to SAN
- **WHEN** the selected line contains a move token that is not legal from the derived position
- **THEN** the control SHALL display the raw token for that move and continue rendering the remaining moves without throwing
