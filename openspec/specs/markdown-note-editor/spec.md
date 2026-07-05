## ADDED Requirements

### Requirement: WYSIWYG markdown editor with formatting toolbar
The note editor popup SHALL display an inline WYSIWYG editing surface that renders formatted content directly (headings, bold, italic, lists, quotes, links) while the underlying content is stored and saved as markdown. A formatting toolbar SHALL apply the formatting to the current selection.

#### Scenario: Editor opens with formatting toolbar
- **WHEN** the note editor popup appears
- **THEN** an editing area SHALL be shown with a toolbar containing formatting options: headings (levels 1 through 6), bold, italic, bulleted list, numbered list, blockquote, and link
- **AND** the toolbar SHALL NOT contain an inline-code button

#### Scenario: Editor renders markdown instead of showing raw source
- **WHEN** the editor is seeded with markdown content (including AI-imported notes)
- **THEN** the content SHALL be displayed as rendered formatted text, not as raw markdown syntax

#### Scenario: Formatting options apply to the selection
- **WHEN** user clicks a formatting button in the toolbar
- **THEN** the corresponding formatting SHALL be applied to the selected text (or at the cursor position)
- **AND** on save the content SHALL be serialised back to markdown

#### Scenario: Editor accepts AI notes pre-filled
- **WHEN** user selects Yes to copy AI notes in the import dialog
- **THEN** the editor SHALL display the complete LLM response with a blank line at the top for user's own notes and cursor positioned in that blank line

#### Scenario: Empty editor opens when user declines AI notes
- **WHEN** user selects No to copy AI notes in the import dialog
- **THEN** the editor SHALL display completely empty and ready for user input

### Requirement: Save and Cancel buttons in note editor
The note editor popup SHALL have Save and Cancel buttons as icon buttons at the bottom of the popup.

#### Scenario: Save button persists notes
- **WHEN** user enters/edits notes and clicks the Save button
- **THEN** the notes SHALL be saved as markdown to the specific move in line details and the popup SHALL close

#### Scenario: Cancel button discards changes
- **WHEN** user clicks the Cancel button
- **THEN** any unsaved changes to the note editor SHALL be discarded and the popup SHALL close
