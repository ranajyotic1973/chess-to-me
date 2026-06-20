## ADDED Requirements

### Requirement: Status and analysis messages auto-dismiss after a fixed delay
The renderer SHALL clear `statusMessage` and `analysisStatus` automatically 2 seconds after either is set to a non-empty value, so the floating `StatusBanner` alert disappears on its own instead of persisting until some other action happens to overwrite it.

#### Scenario: A status message is shown and times out
- **WHEN** any action sets `statusMessage` to a non-empty string
- **THEN** the `StatusBanner` alert SHALL be visible immediately and SHALL disappear automatically 2 seconds later if no other update has changed `statusMessage` in the meantime

#### Scenario: A new status message replaces a pending one before it expires
- **WHEN** `statusMessage` is set to a new value while a previous 2-second dismiss timer is still pending
- **THEN** the previous timer SHALL be cancelled, the banner SHALL show the new message, and a new 2-second dismiss timer SHALL start for it

#### Scenario: analysisStatus dismisses independently of statusMessage
- **WHEN** `analysisStatus` is set to a non-empty value while `statusMessage` is empty, or vice versa
- **THEN** each SHALL auto-dismiss 2 seconds after its own most recent update, independently of the other

### Requirement: SelectableList detail view pins its header during content scroll
When `SelectableList` is showing its detail view (a non-null `selectedId`), the back-button header SHALL remain visually fixed at the top of the control, and only the `children` content below it SHALL scroll when that content exceeds the available space.

#### Scenario: Long detail content scrolls without moving the header
- **WHEN** a user selects a list item whose detail content (`children`) is taller than the available space
- **THEN** the back-button header SHALL stay in place while the user scrolls through the content beneath it

#### Scenario: Short detail content does not introduce a scrollbar
- **WHEN** the selected item's detail content fits within the available space without exceeding it
- **THEN** no internal scrollbar SHALL appear and the content SHALL render at its natural height

#### Scenario: Returning to the list from a scrolled state
- **WHEN** the user has scrolled partway through a long detail view and clicks the back button
- **THEN** the control SHALL return to the list view showing the full list of items, not a scrolled state of the detail view

#### Scenario: Detail view does not auto-revert to the list
- **WHEN** a list item's detail view has been showing for any length of time, including longer than a few seconds
- **THEN** the control SHALL remain in the detail view until the user explicitly clicks the back button — no timer SHALL force a return to the list view on its own

### Requirement: Selecting an Engine Analysis line drills into a fresh analysis of the resulting position
Selecting a line in the Engine Analysis list SHALL, after showing the per-move explanation for its first move, run a new engine analysis of the position resulting from that move and present its top candidate moves as a new list — allowing the user to keep selecting moves to explore deeper into the position tree. Each level explored SHALL be pushed onto a history stack before drilling in, so backing out is restored from that stack rather than requiring a fresh engine or LLM call.

#### Scenario: Drilling into a line shows a new list of candidate moves
- **WHEN** the user selects a line and its per-move explanation finishes loading successfully
- **THEN** a fresh engine analysis of the position after that move SHALL run, and on success its candidate moves SHALL replace the current list — with no item selected, so the new list (not a detail view) is what the user sees

#### Scenario: Drill-down loading is shown separately from the explanation spinner
- **WHEN** the per-move explanation is loading
- **THEN** only that loading indicator SHALL be visible; the drill-down analysis SHALL NOT start until the explanation has finished, so the two never show simultaneous, overlapping spinners

#### Scenario: Backing out of a drilled-into list restores the parent level instantly
- **WHEN** the user clicks back while viewing a list or detail view that resulted from drilling in
- **THEN** the immediately preceding level's lines, entries, board position, and response text SHALL be restored from the history stack without any new engine or LLM call

#### Scenario: The list view shows a back button when a parent level exists
- **WHEN** the current list is the result of drilling into a line (the history stack is non-empty)
- **THEN** the list view SHALL display a back button using the same back-navigation behavior as the detail view's back button

#### Scenario: A real board move or new question clears the drill-down history
- **WHEN** the user makes an actual move on the board, or asks a new question that produces a fresh top-level analysis
- **THEN** any existing drill-down history stack SHALL be cleared, since it no longer corresponds to the current position

#### Scenario: Drilling in does not trigger a duplicate background analysis
- **WHEN** a drill-down analysis succeeds and updates the board position
- **THEN** the existing automatic "auto-eval" analysis (which normally runs whenever the board position changes) SHALL NOT also re-run for that same position change, avoiding a duplicate engine call and avoiding clearing the history stack it just built
