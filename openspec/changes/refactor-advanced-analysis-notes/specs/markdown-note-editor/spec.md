## ADDED Requirements

### Requirement: Markdown editor with formatting toolbar
The note editor popup SHALL display a text editor with markdown support and a formatting toolbar similar to rich text editors, allowing users to format notes while maintaining markdown syntax.

#### Scenario: Editor opens with formatting toolbar
- **WHEN** the note editor popup appears
- **THEN** an editor area SHALL be shown with a toolbar containing formatting options (bold, italic, heading, list, link, code, blockquote)

#### Scenario: Formatting options apply markdown syntax
- **WHEN** user clicks formatting buttons in the toolbar
- **THEN** the corresponding markdown syntax SHALL be inserted at cursor position or wrapped around selected text

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
