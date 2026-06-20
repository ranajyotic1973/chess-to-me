## Why

The app currently lacks version visibility in the title, making it difficult for users to know which release they're running. Increasing the app icon size will make it more visually prominent and easier to recognize at a glance, improving both branding and usability on high-resolution displays.

## What Changes

- Add version number to the app window title (e.g., "Chess To Me v1.0.0")
- Increase the app icon size from current dimensions to 2x (e.g., from 64px to 128px, or proportionally scaled)
- Ensure version is dynamically pulled from the release version for consistency
- Test icon rendering at new size across different screens and DPI settings

## Capabilities

### New Capabilities
- `version-display-in-title`: Display the app version number in the window title bar

### Modified Capabilities
- `app-icon-display`: Increase icon size to 2x current dimensions for better visibility and clarity

## Impact

- Window title bar (Electron app title)
- App icon files and display configuration
- Package.json version reference
- No API changes, no database changes
- Minimal code changes, primarily configuration-based updates
