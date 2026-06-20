## Context

The app is currently built with Electron and uses a window title set statically. The version is defined in `package.json` but not displayed to users. The app icon exists but is a fixed size that may not be optimal for modern high-resolution displays. No architectural changes are needed - both are configuration and resource updates.

## Goals / Non-Goals

**Goals:**
- Display version number in the window title bar dynamically from package.json
- Increase icon size 2x to improve visibility on high-resolution displays
- Ensure version is always in sync with the actual release version
- Make the icon more prominent in taskbars and system interfaces

**Non-Goals:**
- Change the version numbering scheme
- Modify the release process
- Create icon variants for different OS platforms (use 2x scaling uniformly)
- Add version display elsewhere in the UI (only in title bar)

## Decisions

**Decision 1: Read version from package.json at build/runtime**
- Rationale: Single source of truth for version, automatically stays in sync with releases
- Alternative considered: Hard-code version in code (rejected - requires manual sync)
- Implementation: Read package.json in electron/main.ts during app initialization and use it in the window title

**Decision 2: Icon sizing approach**
- Rationale: Increase base icon dimensions 2x (e.g., 64px → 128px) for all platforms
- Alternative considered: Create platform-specific variants (rejected - adds complexity for minimal gain)
- Implementation: Replace icon files with 2x-sized versions in assets/icons/

**Decision 3: Lazy-load version to avoid JSON parsing overhead**
- Rationale: Read package.json once at startup, cache the value for window title creation
- Implementation: In main.ts, read and cache the version string at app initialization

## Risks / Trade-offs

**Risk: Icon dimensions may not match system expectations**
- Mitigation: Use standard sizes (128px is widely supported). Verify rendering on taskbars and dock.

**Risk: Version string parsing failure on corrupted package.json**
- Mitigation: Add try-catch around JSON parsing with fallback to "unknown" version.

**Risk: Icon file size increases with 2x dimensions**
- Mitigation: Acceptable - icon file size increase is minimal and worth the UX improvement.

**Trade-off: Version in title bar uses space**
- The title bar space is ample. Window title is scrollable if content overflows. Trade-off accepted.

## Migration Plan

1. Update icon files in assets/icons/ (replace with 2x-sized versions)
2. Modify electron/main.ts to read version from package.json and use in window title
3. Test window title rendering and icon display
4. Verify package.json version stays in sync with git tags
5. No database changes or user migration needed
6. Rollback: Revert icon files and revert window title code changes

## Open Questions

- What icon file formats exist? (PNG, ICO, ICNS?) - Will determine scope of file updates
- Are there existing icon assets or need to generate from a source file?
