## ADDED Requirements

### Requirement: Imported OTB archive filenames are tracked to enable incremental updates
The main process SHALL maintain a JSON file at `userData/chess-to-me/imported-otb-files.json` containing an array of archive basenames (e.g., `["OTB_2400_1900-2000.7z", "OTB_2400_2001-2010.7z"]`) that have been successfully imported. The tracking file SHALL be created on first successful import if it does not exist. The `db:import-otb-dir` handler SHALL read this file before scanning to determine which files to skip, and append each successfully imported basename after that file's import completes.

#### Scenario: Tracking file is created on first import
- **WHEN** the user imports a directory for the first time and no tracking file exists
- **THEN** `imported-otb-files.json` SHALL be created in `userData/chess-to-me/` and SHALL contain the basenames of all successfully imported archives

#### Scenario: Tracking file prevents duplicate import
- **WHEN** the tracking file exists and contains `["OTB_2400_1900-2000.7z"]`, and the directory still contains that file
- **THEN** the `db:import-otb-dir` handler SHALL skip `OTB_2400_1900-2000.7z` and report it in `skipped`

#### Scenario: Failed import is not tracked
- **WHEN** `doImportGamesFile` returns `{ ok: false }` for an archive
- **THEN** that archive's basename SHALL NOT be appended to `imported-otb-files.json`, ensuring the file will be retried on the next import run
