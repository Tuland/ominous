# meeting-selection Specification

## Purpose
Decides which calendar events raise an alert, so the card takes over the screen only for the
meetings the user wants to be interrupted for.

## Requirements

### Requirement: Only meetings with a join link
`ominous.json` SHALL accept `onlyWithLink`, a boolean, default `false`; any value other than
`true` SHALL read as `false`. When it is `true`, an event SHALL alert only if it has a join link
the card can open: an `https://` URL in the event's conference link. A link that appears only in
the event's location, a non-`https` link and an empty one SHALL NOT count. The `status` counts of
upcoming alerts SHALL apply the same rule.

#### Scenario: Default keeps every meeting
- **WHEN** `onlyWithLink` is not set and a meeting has no conference link
- **THEN** the meeting alerts as before

#### Scenario: A meeting without a link is skipped
- **WHEN** `onlyWithLink` is `true` and a meeting has no conference link
- **THEN** no alert is shown for it, and it is not counted as upcoming in `status`

#### Scenario: A meeting with a join link alerts
- **WHEN** `onlyWithLink` is `true` and a meeting's conference link is `https://meet.google.com/abc-defg-hij`
- **THEN** the meeting alerts, with its Join button

#### Scenario: An insecure link does not count
- **WHEN** `onlyWithLink` is `true` and a meeting's conference link is `http://example.com/call`
- **THEN** no alert is shown for it

#### Scenario: A value that is not true
- **WHEN** `onlyWithLink` is `"yes"` or `1`
- **THEN** it reads as `false` and every meeting alerts
