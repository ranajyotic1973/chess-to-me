## ADDED Requirements

### Requirement: Remove BMAD scaffolding
The repository SHALL delete the `_bmad`, `_bmad-output`, and `.agents` directories so the working tree contains only the Electron trainer, OpenSpec metadata, and other production artifacts.

#### Scenario: Fresh checkout contains legacy directories
- **WHEN** a developer clones the repo after the change and inspects the root
- **THEN** `_bmad`, `_bmad-output`, and `.agents` do not exist, and no references to them remain in the tracked tree

### Requirement: Document the spec-driven workflow
README.md and related contributor-facing docs SHALL explain that the desktop app is governed by the `openspec/specs/chess-trainer` specification, describe how to list and apply active changes, and link to the change directory anchoring this conversion.

#### Scenario: Onboarding an OpenSpec contributor
- **WHEN** a contributor opens README.md for the first time after this change
- **THEN** they read clear guidance about running `openspec list`, finding `openspec/changes/convert-to-openspec`, and understanding that the repo now centers around `openspec/specs/chess-trainer/spec.md`

### Requirement: Spec coverage for the shipped app
The `openspec/specs/chess-trainer/spec.md` file SHALL capture the desktop Stockfish/LLM workflow, installer outputs, and reference-game features described in the design so contributors have a single source of truth for the current product scope.

#### Scenario: Quality-reviewing the spec after conversion
- **WHEN** an engineer opens `openspec/specs/chess-trainer/spec.md`
- **THEN** they find requirements covering Stockfish detection, FEN loading, multi-line analysis, Ollama explanations, reference-game playback, and NSS installer tooling, matching the existing renderer behavior
