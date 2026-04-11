## ADDED Requirements

### Requirement: Settings-first entry
The renderer SHALL show the settings page on first launch, preventing the chessboard from rendering until the user explicitly saves and navigates to the board.

#### Scenario: First launch without saved settings
- **WHEN** the application loads and no settings flag exists in local storage
- **THEN** the settings screen is displayed, the chessboard and analysis panels remain hidden, and a primary call-to-action button labeled "Open analysis" appears

#### Scenario: Saving settings transitions to analysis
- **WHEN** the user fills the settings form and clicks the call-to-action button
- **THEN** the settings are persisted, the settings view hides, and the analysis view becomes visible

### Requirement: Persisted settings behavior
The system SHALL skip the settings screen on subsequent launches once the settings flag exists and immediately show the analysis view.

#### Scenario: Returning user sees analysis view
- **WHEN** the application loads and the saved-settings flag is present
- **THEN** the settings page is bypassed, the analysis view appears directly, and no settings CTA is shown until invoked via the gear icon

### Requirement: Analysis chrome without menus or legacy titles
The analysis view SHALL not display any window menu bar, text reading "Tailwind + ChessboardJS analysis studio", or "Chess To Me"; instead it SHALL show only the board layout and a FontAwesome gear icon in the top area.

#### Scenario: Analysis view chrome
- **WHEN** the analysis view is rendered
- **THEN** there is zero menu text or branding copy other than the gear icon, and the gear icon allows re-opening the settings screen manually
