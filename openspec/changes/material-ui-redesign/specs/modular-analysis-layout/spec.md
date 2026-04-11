## ADDED Requirements

### Requirement: Analysis view is composed of modular components
The renderer SHALL split the analysis/settings UI into focused modules (e.g., SettingsPanel, AnalysisBoard, ChatPanel, StatusBanner) so each component manages its own markup/props while App orchestrates state and handlers.

#### Scenario: Debugging modules
- **WHEN** a developer inspects the analysis view
- **THEN** each panel is located in its own file under src/components/, exposes well-defined props for status/data, and can be rendered independently for debugging or storybook use

### Requirement: Modules share clear props and callbacks
Each modular component SHALL declare the data it needs (status strings, event handlers, FEN updates) so the orchestrating container does not contain massive markup logic.

#### Scenario: Updating board behavior
- **WHEN** the board needs to react to a new Stockfish status
- **THEN** the AnalysisBoard component receives its status, en, and onMove callbacks via props instead of reading global state directly
