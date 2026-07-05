## MODIFIED Requirements

### Requirement: Selected-line moves control lists the full move sequence of the selected engine line
The analysis panel SHALL render a control, labelled "Moves of selected line", that displays every move of the currently selected engine line (its principal variation) in SAN notation with move numbers. The control SHALL be positioned ABOVE the "Moves Played" control and SHALL mirror its visual styling, including a numbered heading rendered inside the box (e.g. "2. Moves of selected line", with "Moves Played" numbered "3."). When no engine line is selected, the control SHALL NOT be shown. Once a line is explicitly selected, the control SHALL remain visible across the analysis pass that runs for the resulting position (it SHALL NOT disappear when that engine analysis completes).

#### Scenario: A line is selected
- **WHEN** the user selects an engine line whose principal variation is `e2e4 e7e5 g1f3`
- **THEN** the "Moves of selected line" control SHALL appear and display the moves as `1. e4 e5 2. Nf3`

#### Scenario: Control appears above Moves Played with a numbered heading
- **WHEN** the "Moves of selected line" control and the "Moves Played" control are both shown
- **THEN** the "Moves of selected line" control SHALL appear above the "Moves Played" control
- **AND** its heading SHALL read "2. Moves of selected line" while the "Moves Played" heading SHALL read "3. Moves Played"

#### Scenario: Control persists after the post-selection analysis completes
- **WHEN** the user explicitly selects an engine line from a position where White has not yet moved (so the resulting FEN's move number is still 1) and the follow-up engine analysis completes
- **THEN** the selection SHALL be preserved and the "Moves of selected line" control SHALL remain visible

#### Scenario: Selection changes
- **WHEN** the user switches from one selected line to another
- **THEN** the control SHALL update to show the newly selected line's moves and SHALL NOT retain the previous line's moves

#### Scenario: No line selected
- **WHEN** no engine line is currently selected
- **THEN** the "Moves of selected line" control SHALL NOT be rendered
