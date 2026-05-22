## ADDED Requirements

### Requirement: Hide solution/explanation until user request
The system SHALL support hiding the LLM explanation/solution when `hidden_solution: true` is included in the response, displaying only a "Reveal Solution" button initially.

#### Scenario: Puzzle solution is hidden by default
- **WHEN** LLM returns `response_type: "Puzzle"` with `hidden_solution: true`
- **THEN** the explanation text is not displayed; only a "Reveal Solution" button appears

#### Scenario: User reveals solution on demand
- **WHEN** user clicks "Reveal Solution" button
- **THEN** the full explanation becomes visible

#### Scenario: Solution remains hidden across navigation
- **WHEN** user navigates away and returns to same puzzle
- **THEN** solution remains hidden until button is clicked again

#### Scenario: Non-puzzle responses show explanation immediately
- **WHEN** response type is "Analysis" or "Position"
- **THEN** explanation is visible by default, no reveal button

### Requirement: Toggle button state persists during session
The system SHALL remember whether user has revealed solution for each response within current session.

#### Scenario: Solution state remembered after scroll
- **WHEN** user scrolls up in chat after revealing solution
- **THEN** solution is still visible when scrolling back down
