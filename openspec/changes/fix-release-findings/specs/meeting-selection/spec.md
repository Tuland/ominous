## ADDED Requirements

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
