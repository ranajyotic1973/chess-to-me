## ADDED Requirements

### Requirement: User can set an optional display name in Settings
The Settings page SHALL include an optional text field labelled "Display Name". When the field is saved with a non-empty value, that value SHALL be stored as `displayName` in the user settings file. When left blank (or cleared), the setting SHALL be stored as an empty string and the app SHALL resolve the display name to the OS login username at runtime.

#### Scenario: User saves a custom display name
- **WHEN** the user types "Alice" into the Display Name field and saves Settings
- **THEN** subsequent reads of the display name SHALL return "Alice"

#### Scenario: User leaves Display Name blank
- **WHEN** the Display Name field is empty and Settings are saved
- **THEN** the app SHALL resolve the display name to the operating system login username (e.g. `os.userInfo().username`)

#### Scenario: Display name is cleared after being set
- **WHEN** a user previously set "Alice" then clears the field and saves
- **THEN** the resolved display name SHALL revert to the OS username

### Requirement: Profile icon is displayed in the top-right of the main screen
The main application screen SHALL show a profile icon widget in the top-right corner of the header bar. The widget SHALL display the user's initials (derived from the display name or OS username) and the current puzzle points as a numeric badge. When no puzzle has been solved yet, the badge SHALL display "—" instead of a number.

#### Scenario: Profile icon shows initials and uninitialized points
- **WHEN** the app is opened for the first time and no puzzle has been solved
- **THEN** the profile icon SHALL show the user's initials and the badge SHALL display "—"

#### Scenario: Profile icon shows current points after first solve
- **WHEN** the user has solved at least one puzzle
- **THEN** the badge SHALL display the current numeric puzzle points

#### Scenario: Clicking the profile icon shows a popover
- **WHEN** the user clicks the profile icon
- **THEN** a popover SHALL appear showing the full display name and the total puzzle points (or "No puzzles solved yet" if uninitialised)
