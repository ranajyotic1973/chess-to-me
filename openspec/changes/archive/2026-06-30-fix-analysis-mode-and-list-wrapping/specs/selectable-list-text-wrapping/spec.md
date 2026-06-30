# selectable-list-text-wrapping Specification

## ADDED Requirements

### Requirement: Single-item lists allow text wrapping for better visibility

When a SelectableList contains exactly one item, the label and sublabel SHALL be allowed to wrap across multiple lines to maximize visible text without truncation.

#### Scenario: Single item wraps across lines
- **WHEN** a SelectableList is rendered with `items.length === 1` and the label text is long
- **THEN** the label SHALL wrap to multiple lines (via `whiteSpace: "normal"`) and no ellipsis SHALL appear

#### Scenario: Single item sublabel wraps
- **WHEN** a SelectableList has one item with a long sublabel
- **THEN** the sublabel SHALL wrap and no ellipsis truncation SHALL occur

### Requirement: Multi-item lists restrict text to single line with ellipsis

When a SelectableList contains multiple items, each item's label and sublabel SHALL be forced to single-line format with ellipsis truncation to maintain scannable list layout.

#### Scenario: Multiple items use single-line format
- **WHEN** a SelectableList is rendered with `items.length > 1`
- **THEN** each item's label SHALL NOT wrap (via `whiteSpace: "nowrap"`) and text SHALL be truncated with ellipsis (`textOverflow: "ellipsis"`) if it exceeds container width

#### Scenario: Multiple items sublabel is single-line
- **WHEN** a SelectableList with multiple items has sublabels
- **THEN** each sublabel SHALL be rendered as single-line with ellipsis truncation

#### Scenario: Wrapping mode is conditional on count
- **WHEN** a SelectableList changes from 1 item to 2+ items (or vice versa)
- **THEN** the CSS wrapping behavior SHALL update dynamically to match the new item count (single-line for 2+, wrapping for 1)
