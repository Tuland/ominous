## ADDED Requirements

### Requirement: Card text is plain text
Every text the card shows SHALL be rendered as plain text, never interpreted as rich text or
markup, whatever it contains. This covers the calendar name, the meeting title and location,
the theme captions, and the plugin's own labels.

#### Scenario: Markup in a calendar name
- **WHEN** an alert opens for a meeting whose calendar name is `<img src="https://example.com/x.png">Team`
- **THEN** the card shows those characters literally and makes no network request for the image

#### Scenario: A new text on the card
- **WHEN** a `Text` element without `textFormat: Text.PlainText` is added to the plugin's QML
- **THEN** the unit tests fail and name the file and line
