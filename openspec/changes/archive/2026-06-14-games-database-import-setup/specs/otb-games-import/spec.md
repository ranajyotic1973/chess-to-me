## ADDED Requirements

### Requirement: Settings panel displays OTB bulk-import instructions in the Games Database section
The Games Database subsection in Settings SHALL display instructional text explaining that the user must manually download the complete OTB archive set from lumbrasgigabase.com before using the directory import feature. The instructions SHALL:
1. Tell the user to visit the Lumbrasgigabase download page (shown as a clickable link).
2. Explain they must download all files whose names match `*OTB*.7z` into a single local folder.
3. Note that monthly update files from the same page can be added to the same folder and imported the same way.

#### Scenario: User opens Settings with no OTB directory configured
- **WHEN** the user opens Settings and no `otbImportDir` has been saved
- **THEN** the Games Database section SHALL display the instructional text and link, with an empty directory path field

#### Scenario: Instructional text is always visible
- **WHEN** the user opens Settings regardless of whether a directory is configured or games are imported
- **THEN** the instructional text and Lumbrasgigabase link SHALL be visible above the directory field

### Requirement: Settings panel provides a directory path field and Browse button for the OTB import directory
The Games Database section SHALL include a text input showing the currently saved `otbImportDir` path, and a "Browse…" button next to it. Clicking "Browse…" SHALL open an Electron `dialog.showOpenDialog` with the `openDirectory` property (selecting a folder, not individual files). The selected path SHALL be written to the `otbImportDir` settings key immediately and the text input SHALL update to reflect it.

#### Scenario: User browses and selects a directory
- **WHEN** the user clicks "Browse…" and selects a folder in the dialog
- **THEN** the directory path text input SHALL update to show the selected folder path, and `otbImportDir` SHALL be saved to settings

#### Scenario: User cancels the directory dialog
- **WHEN** the user clicks "Browse…" and dismisses the dialog without selecting a folder
- **THEN** the directory path text input SHALL remain unchanged

#### Scenario: User pastes a path manually into the text field
- **WHEN** the user types or pastes a path into the directory path text input
- **THEN** the field SHALL update live and the value SHALL be saved to `otbImportDir` when the user clicks "Save settings"

### Requirement: Import All OTB Files button triggers a directory scan and sequential import
The Games Database section SHALL include an "Import All OTB Files" button. Clicking it SHALL invoke the `db:import-otb-dir` IPC handler with the current `otbImportDir` path. The handler SHALL:
1. Scan the specified directory for files whose names match the glob `*OTB*.7z` (case-insensitive on Windows, case-sensitive on Linux/macOS).
2. Read `userData/chess-to-me/imported-otb-files.json` to get the list of already-imported filenames; skip files whose basename is already in that list.
3. Import each remaining file sequentially by calling the existing `doImportGamesFile` function.
4. After each successful file import, append the file's basename to the tracking JSON.
5. Emit `db:otb-dir-progress` IPC events throughout (see progress requirement below).
6. Return `{ ok: true, imported: N, skipped: N, errors: N }` on completion, or `{ ok: false, error: string }` if the directory cannot be scanned.

The button SHALL be disabled while an import is in progress.

#### Scenario: First-time import with five OTB archives
- **WHEN** the user clicks "Import All OTB Files" with a directory containing five `*OTB*.7z` files and no tracking file
- **THEN** all five files SHALL be imported sequentially; the tracking file SHALL contain all five basenames on completion; the completion summary SHALL show `imported: 5, skipped: 0`

#### Scenario: Monthly update — one new file added to directory
- **WHEN** the user adds a new monthly archive to the directory and clicks "Import All OTB Files" again
- **THEN** only the new file SHALL be imported; the four previously imported files SHALL be skipped; the completion summary SHALL show `imported: 1, skipped: 4`

#### Scenario: No matching files found in directory
- **WHEN** the user clicks "Import All OTB Files" and the selected directory contains no `*OTB*.7z` files
- **THEN** the handler SHALL return `{ ok: true, imported: 0, skipped: 0, errors: 0 }` and the Settings panel SHALL display "No OTB archive files found in the selected directory"

#### Scenario: Directory path is empty
- **WHEN** the user clicks "Import All OTB Files" and no directory path is set
- **THEN** the button SHALL be disabled (not clickable)

#### Scenario: One file fails during multi-file import
- **WHEN** one of the archives is corrupt and `doImportGamesFile` returns `{ ok: false }`
- **THEN** that file SHALL be counted in `errors`, SHALL NOT be added to the tracking file, import SHALL continue with remaining files, and the final summary SHALL reflect the partial success

### Requirement: OTB directory import progress is streamed via a dedicated IPC event
During a directory import the main process SHALL emit `db:otb-dir-progress` events on `event.sender` with shape `{ fileIndex: number, totalFiles: number, fileName: string, phase: string, percent: number, message: string }`. The renderer SHALL subscribe to this event for the duration of the import and display the progress in the Games Database section.

#### Scenario: Progress display during multi-file import
- **WHEN** the import is processing the third of seven archives
- **THEN** the Settings panel SHALL display text similar to "File 3 of 7: OTB_2400_2001-2010.7z — Importing… 62%"

#### Scenario: Progress subscription is torn down after completion
- **WHEN** the `db:otb-dir-complete` event is received
- **THEN** the renderer SHALL unsubscribe from `db:otb-dir-progress` and update the status line with the completion summary

### Requirement: OTB import directory path is persisted across sessions
The `otbImportDir` value SHALL be saved in the existing electron-store settings object (same store as engine paths and LLM keys). On Settings panel mount, the saved value SHALL be loaded and pre-populate the directory path text input.

#### Scenario: Directory path survives app restart
- **WHEN** the user sets a directory path, saves settings, and restarts the app
- **THEN** the Settings panel SHALL show the previously saved directory path in the text input on next open

### Requirement: IPC handlers for OTB directory import are exposed in preload and typed
The preload script SHALL expose:
- `browseOtbDir(): Promise<{ dirPath: string | null }>` — opens the folder-select dialog
- `importOtbDir(dirPath: string): Promise<{ ok: boolean; imported?: number; skipped?: number; errors?: number; error?: string }>` — triggers the directory scan and sequential import
- `onOtbDirProgress(cb): () => void` — subscribes to `db:otb-dir-progress` events, returns an unsubscribe function
- `onOtbDirComplete(cb): () => void` — subscribes to `db:otb-dir-complete` events, returns an unsubscribe function

The `ElectronAPI` interface in `src/types/index.ts` SHALL include all four methods with correct TypeScript signatures.

#### Scenario: Type safety for import result
- **WHEN** the renderer calls `electronAPI.importOtbDir(path)` and the TypeScript compiler checks the return type
- **THEN** the compiler SHALL enforce that `imported`, `skipped`, and `errors` are `number | undefined` and `error` is `string | undefined`
