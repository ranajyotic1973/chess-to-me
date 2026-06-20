## ADDED Requirements

### Requirement: Display version in window title
The application SHALL display the current version number in the window title bar, automatically sourced from package.json, in the format "Chess To Me v<version>".

#### Scenario: App starts with version in title
- **WHEN** the application starts
- **THEN** the window title displays "Chess To Me v1.0.0" (or the current version from package.json)

#### Scenario: Version remains consistent across app lifetime
- **WHEN** the app is running
- **THEN** the window title never changes and continues to display the same version number

#### Scenario: Version updates with releases
- **WHEN** package.json is updated to a new version (e.g., 1.1.0)
- **THEN** the next app start displays the new version in the window title

### Requirement: Handle missing or invalid version gracefully
The system SHALL gracefully handle scenarios where the version cannot be read, defaulting to "unknown" version rather than crashing.

#### Scenario: Corrupted package.json
- **WHEN** package.json is missing or corrupted
- **THEN** the window title displays "Chess To Me (unknown version)" and the app continues to function normally

#### Scenario: Version parsing error
- **WHEN** version field in package.json is malformed
- **THEN** the app logs a warning and displays "Chess To Me (unknown version)" in the window title
