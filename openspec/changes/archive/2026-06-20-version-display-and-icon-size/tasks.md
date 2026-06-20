## 1. Icon File Discovery and Sizing

- [x] 1.1 Locate all app icon files in assets/icons/ and identify current dimensions
- [x] 1.2 Document icon formats (PNG, ICO, ICNS, etc.) and current sizes
- [x] 1.3 Create 2x-sized versions of all icon files (or scale proportionally)
- [x] 1.4 Verify icon files are in correct locations for Electron build (assets/icons/)
- [x] 1.5 Test icon rendering on Windows taskbar at new size
- [x] 1.6 Test icon rendering on macOS dock at new size (if applicable)

## 2. Version Display Implementation

- [x] 2.1 Modify electron/main.ts to read version from package.json at app startup
- [x] 2.2 Add error handling for missing or corrupted package.json (fallback to "unknown")
- [x] 2.3 Store version in a global variable or constant for window title use
- [x] 2.4 Update the window title creation to use format: "Chess To Me v<version>"
- [x] 2.5 Verify version displays correctly in window title bar on app start
- [x] 2.6 Test version displays correctly after package.json version update

## 3. Build and Verification

- [x] 3.1 Run full build (npm run build:electron) to verify no errors
- [x] 3.2 Verify icon files are included in build output
- [x] 3.3 Launch dev build and confirm version in window title
- [x] 3.4 Launch dev build and confirm icon displays at correct size
- [x] 3.5 Update package.json version and restart to verify dynamic loading
- [x] 3.6 Test graceful fallback when package.json is corrupted (manual test)

## 4. Cleanup and Documentation

- [x] 4.1 Remove old/smaller icon files if no longer needed
- [x] 4.2 Update any icon asset documentation or comments
- [x] 4.3 Verify no broken image references in the codebase
- [x] 4.4 Commit all changes with clear commit message
