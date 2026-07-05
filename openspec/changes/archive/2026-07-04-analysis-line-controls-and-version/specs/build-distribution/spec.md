## ADDED Requirements

### Requirement: Displayed app version is sourced from the git tag
The application version shown to the user in the window title bar and on the splash screen SHALL be derived from the git tag rather than a separately hand-maintained literal, so that both surfaces always show the same value and it matches the released tag. The derivation SHALL happen at build time and SHALL provide a sensible fallback when no tag is available (for example an untagged local checkout).

#### Scenario: Title bar and splash match the tag
- **WHEN** the app is built from a commit tagged `v1.7.0`
- **THEN** the window title SHALL read `Chess To Me v1.7.0` AND the splash screen SHALL display `v1.7.0`

#### Scenario: Title bar and splash never disagree
- **WHEN** the app is running
- **THEN** the version string shown in the title bar SHALL equal the version string shown on the splash screen

#### Scenario: Untagged checkout falls back gracefully
- **WHEN** the app is built from a checkout that has no reachable git tag
- **THEN** the build SHALL substitute a defined fallback version string rather than failing, and both surfaces SHALL show that fallback
