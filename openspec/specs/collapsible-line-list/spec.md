# collapsible-line-list Specification

## Purpose
TBD - created by archiving change analysis-line-controls-and-version. Update Purpose after archive.

## Requirements

### Requirement: The Top Lines list can be collapsed and expanded
The analysis "Top Lines" list control SHALL provide a collapse/expand icon button. Activating it while the list is expanded SHALL hide the list body to reclaim vertical space; activating it while collapsed SHALL restore the list. The control SHALL default to expanded when analysis lines first appear.

#### Scenario: Collapse the list
- **WHEN** the Top Lines list is expanded and the user clicks the collapse icon button
- **THEN** the list of lines SHALL be hidden and the icon SHALL indicate a collapsed state

#### Scenario: Expand the list
- **WHEN** the Top Lines list is collapsed and the user clicks the expand icon button
- **THEN** the list of lines SHALL be shown again and the icon SHALL indicate an expanded state

#### Scenario: Default state
- **WHEN** engine analysis lines first appear in the panel
- **THEN** the Top Lines list SHALL be expanded by default

### Requirement: Collapse toggle only hides the list, not other controls
Collapsing the Top Lines list SHALL affect only that list's body. Other controls in the panel — including the "Moves Played" control, the "Moves of selected line" control, and the line explanation — SHALL remain visible and functional when the list is collapsed.

#### Scenario: Collapsing preserves sibling controls
- **WHEN** a line is selected and the user collapses the Top Lines list
- **THEN** the "Moves Played" and "Moves of selected line" controls SHALL remain visible and the current selection SHALL be unchanged
