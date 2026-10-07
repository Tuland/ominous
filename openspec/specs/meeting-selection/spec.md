# meeting-selection Specification

## Purpose
Decides which calendar events raise an alert, and how many cards a crowd of them may open, so
the card takes over the screen only for the meetings the user wants to be interrupted for.

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

### Requirement: One card per group of meetings
When an alert fires for an event, every other alertable event that the user has not confirmed
(neither accepted nor organizes) and that starts at the same time or within the following 60
seconds SHALL be marked as alerted, so it SHALL NOT open a card of its own. An event the user
accepted or organizes SHALL always get its own card, and among events starting at the same time
it SHALL be alerted first. An event whose start is not a date (missing, not a finite number, or
beyond what a date can hold) SHALL NOT be alertable.

#### Scenario: A flood of invitations for the same time
- **WHEN** fifty unanswered invitations start at the same minute and the first alert fires
- **THEN** no other card opens for those fifty events

#### Scenario: Invitations spread a few seconds apart
- **WHEN** forty unanswered invitations start five seconds apart from each other
- **THEN** at most one card a minute opens for them

#### Scenario: An accepted meeting at the time of an invitation
- **WHEN** an unanswered invitation and an accepted meeting start at 10:00
- **THEN** the accepted meeting's card opens first, and it is not swallowed by the invitation's

#### Scenario: A late meeting and the next one
- **WHEN** an alert fires for a meeting that started 90 seconds ago and another starts in 40 seconds
- **THEN** the second meeting gets its own card

#### Scenario: A later meeting still alerts
- **WHEN** a card fired for a 10:00 meeting and another meeting starts at 10:30
- **THEN** the 10:30 meeting alerts when its own window opens

#### Scenario: A start out of range
- **WHEN** an event's start is `1e300`
- **THEN** it does not alert and `status` still answers
