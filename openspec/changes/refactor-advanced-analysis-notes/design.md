## Context

Currently, the application has a separate Notes panel in advanced analysis mode that is disconnected from moves. Users must manually manage notes separately from the line analysis. The new requirement is to integrate notes directly into moves via a click-to-edit workflow, with markdown support and PGN export capabilities.

## Goals / Non-Goals

**Goals:**
- Remove the existing Notes panel component and related state management
- Implement click-on-move notes with two-popup workflow (AI import confirmation → markdown editor)
- Store notes per-move as markdown within the line details structure
- Provide markdown editor with formatting toolbar
- Support PGN export with embedded notes
- Show visual indicator (bar) on moves that have notes
- Maintain markdown format for notes storage and export

**Non-Goals:**
- Rich text storage (markdown only, no WYSIWYG formatting)
- Collaborative/sync notes features
- Notes versioning or history
- Cloud storage of notes

## Decisions

### Decision 1: Store notes within line details structure
Store notes as markdown strings keyed by move index within the line's move array, rather than in a separate global notes state.

**Rationale:** Keeps notes coupled with their moves, making export and undo/redo simpler. When a line changes, its notes automatically travel with it.

**Alternatives considered:**
- Separate global notes map: Would require complex sync logic between line changes and notes
- Database storage: Overkill for local analysis, adds external dependency

### Decision 2: Use dialog/modal for note editor, not inline
Implement notes editing in a modal dialog popup, not inline in the line details.

**Rationale:** Provides focus and dedicated space for markdown editor with toolbar. Prevents accidental edits and keeps line details readable.

**Alternatives considered:**
- Inline edit: Complicates line details layout, hard to show toolbar
- Sidebar: Takes permanent screen real estate, less focused

### Decision 3: Two-popup workflow for AI import
First popup asks "Do you want to copy AI notes?" → Second popup opens editor.

**Rationale:** Allows users to choose whether to include AI analysis without cluttering the editor. Clean separation of concerns.

**Alternatives considered:**
- Single popup with checkbox: Less clear to users
- No option: Assumes all users want AI notes, inflexible

### Decision 4: Use Markdown for note storage and toolbar-assisted editing
Editor displays markdown source with toolbar buttons inserting markdown syntax. Notes saved as plain markdown.

**Rationale:** Markdown is human-readable, portable, and widely compatible. Toolbar guides users without requiring markdown knowledge.

**Alternatives considered:**
- Full WYSIWYG with rich text storage: Bloats storage, harder to export/version
- Plain text only: Lacks formatting capability
- Custom format: Non-standard, hard to export

### Decision 5: PGN export includes notes in comment fields
When exporting to PGN, embed markdown notes in move annotations using standard PGN comment syntax: `{markdown content here}`

**Rationale:** Standard PGN supports comments; most chess software respects comment fields. Preserves notes with the line data.

**Alternatives considered:**
- Separate notes file: Splits data, risk of losing sync
- Custom PGN extension: Non-standard, reduced compatibility

## Risks / Trade-offs

**Risk: Move index stability** → Store notes by move index; if moves are reordered/inserted, notes could get misaligned. Mitigation: Rebuild notes map on significant line changes, or use move hash as key.

**Risk: Markdown vs. formatted text** → Users may expect rich text formatting but get markdown syntax. Mitigation: Toolbar buttons hide markdown details from casual users.

**Risk: Performance with many notes** → Large markdown content in notes could slow rendering. Mitigation: Lazy-load notes, don't render all notes unless needed; truncate in preview.

**Risk: PGN interoperability** → Not all PGN readers handle comments identically. Mitigation: Test export with common chess software; ensure markdown is plain text (no binary data).

## Migration Plan

1. Create `NoteEditorPopup` component with markdown editor and toolbar
2. Create `AIImportDialog` component for the confirmation popup
3. Add `notes` field to line move storage (object mapping move index → markdown string)
4. Add "Click on any move to write notes" hint text above line details in advanced analysis mode
5. Add click handler to moves that opens AI import dialog → note editor
6. Add visual note indicator bar to moves that have notes
7. Add "Save" button to advanced analysis panel that opens file dialog for PGN export
8. Implement PGN export function that extracts moves with notes and converts to PGN format
9. Remove old Notes panel component and related state
10. Test with various note lengths, markdown syntax, and PGN export/import roundtrips

## Open Questions

1. Should notes be persisted to localStorage if user saves analysis without exporting PGN?
2. How should notes be handled if a line is replaced (e.g., user changes selected line)? Keep notes attached to move data or discard?
3. Should markdown toolbar support nested formatting (bold inside italic, etc.) or just single-level?
4. For PGN export, should we include move numbers in comments or just the notes themselves?
5. Should there be a character limit on notes per move to prevent extremely long PGN files?
