# Spec Delta

## ADDED Requirements

### Requirement: A bounded agenda read
Each agenda refresh SHALL accept at most 1 MiB (1048576 bytes) of OmaCal's output and SHALL stop
reading after one more byte, so the shell never holds more than 1048577 bytes of it. A larger
output SHALL be refused as an error, named in the log and in `status` (`lastError`), and the
events read before SHALL stay in use until a refresh succeeds.

#### Scenario: An output over the limit
- **WHEN** OmaCal prints more than 1 MiB
- **THEN** `status` shows `lastError` "agenda too large", and a meeting from the previous refresh still alerts when it is due while the error lasts

#### Scenario: Back under the limit
- **WHEN** a refresh after an oversize one reads a valid agenda
- **THEN** `lastError` is empty again and the new agenda is used

#### Scenario: An output at the limit
- **WHEN** OmaCal prints exactly 1048576 bytes of valid agenda JSON
- **THEN** the agenda is read and used as usual

#### Scenario: Text outside ASCII near the limit
- **WHEN** OmaCal prints more than 1048576 bytes whose text, counted in characters, is under 1048576
- **THEN** the output is refused as too large, not read as a broken agenda

### Requirement: An open card follows the calendar
While a card opened by an agenda alert is on screen, each refresh SHALL compare its meeting with
the agenda and, when the meeting changed, update the card as the following requirements say. A
card the user dismissed SHALL NOT reopen, a card opened by `test` or `preview` SHALL NOT be
changed or closed by a refresh, and a card counting down to close SHALL NOT be followed any more.
A change of the user's own config SHALL NOT count as a calendar change.

#### Scenario: Nothing changes
- **WHEN** a card is open and a refresh brings its meeting unchanged, including right after the card was updated
- **THEN** the card stays as it is: the selection and the input guard are not reset

#### Scenario: The user dismissed the card
- **WHEN** the user dismisses a card and a refresh then brings its meeting with a changed link
- **THEN** no card opens until another alert is due

#### Scenario: The config changes while a card is open
- **WHEN** a card is open and the user removes its calendar from `calendars` before the next refresh
- **THEN** the card stays as it is

#### Scenario: A test or preview card
- **WHEN** the card on screen was opened by `test` or `preview` and a refresh brings changes to the meeting of an earlier agenda card
- **THEN** the refresh does not change or close the test or preview card on that account; an alert that falls due replaces it, as before

### Requirement: A changed meeting updates the card with a note
When the title, end, place, calendar or link the card would show changed and the meeting still
alerts, the card SHALL show the
new values and the line "Changed in your calendar: " followed by the names of the changed fields
(`title`, `end`, `place`, `calendar`, `link`). The selection SHALL follow the usual rule for the
new link, and the input guard SHALL restart. The note SHALL hold no text from the calendar.

#### Scenario: The link changes
- **WHEN** a card is open for a meeting and a refresh brings it with its link changed from `https://meet.google.com/abc` to `https://evil.example/x`
- **THEN** the card shows "Changed in your calendar: link" and "Join on evil.example" with Dismiss selected, and Join opens the new link, never the old one

#### Scenario: The link changes to another recognized link
- **WHEN** the link changes from `https://meet.google.com/abc` to `https://meet.google.com/xyz`
- **THEN** the card shows "Changed in your calendar: link", Join is selected, and Join opens the new link

#### Scenario: Two fields change
- **WHEN** a refresh brings the meeting with another title and another place
- **THEN** the card shows them and "Changed in your calendar: title, place"

### Requirement: A removed or declined meeting counts down and closes
When the card's meeting is no longer in the agenda or no longer alerts, and has not moved, the card SHALL keep the
meeting's last values, hide Join, select Dismiss, and show "Declined in your calendar" when the
user declined it, else "Removed from your calendar", followed by " - closing in N s", counting
down from 15. At zero, or at the meeting's end if sooner, the card SHALL close; Esc and Dismiss
SHALL close it at once.

#### Scenario: Cancelled
- **WHEN** a card is open and a refresh no longer holds its meeting
- **THEN** the card shows "Removed from your calendar - closing in 15 s", counts down, and closes 15 seconds later

#### Scenario: Declined
- **WHEN** a card is open and a refresh holds its meeting declined
- **THEN** the card shows "Declined in your calendar - closing in 15 s" without a Join button

#### Scenario: Closed early
- **WHEN** the countdown shows and the user presses Esc after the input guard
- **THEN** the card closes at once

### Requirement: A moved meeting counts down and closes
When the card's meeting moved to another start (the same meeting, not part of a recurring series)
and still alerts, the card SHALL keep its last values, hide Join, select Dismiss, and show
"Moved to HH:MM" (with the weekday when not today) followed by " - closing in N s", counting down
from 15; at zero, or at the meeting's end if sooner, it SHALL close. The meeting SHALL alert again
for its new start, if that start is still ahead.

#### Scenario: Moved later
- **WHEN** a card is open at 9:59:30 for a 10:00 meeting with `leadSeconds` 60 and a refresh moves it to 15:00
- **THEN** the card shows "Moved to 15:00 - closing in 15 s" with the old title and time and no Join button, closes 15 seconds later, and a new card opens at 14:59

#### Scenario: Moved by one minute
- **WHEN** a card is open at 9:59:30 for a 10:00 meeting with `leadSeconds` 60 and a refresh moves it to 10:01
- **THEN** the card shows "Moved to 10:01 - closing in 15 s", and a card for 10:01 opens at 10:00

#### Scenario: Moved to another day
- **WHEN** a refresh moves the meeting to tomorrow at 9:00
- **THEN** the note reads "Moved to <weekday> 09:00 - closing in 15 s"

#### Scenario: Moved and declined
- **WHEN** a refresh moves the meeting and it is declined
- **THEN** the card shows "Declined in your calendar - closing in 15 s"

#### Scenario: A recurring meeting
- **WHEN** a card is open for a meeting of a recurring series and a refresh no longer holds that occurrence at its start
- **THEN** the card shows "Removed from your calendar - closing in 15 s", never "Moved"

### Requirement: New alerts wait for a closing card
While a card counts down to close, a new alert SHALL wait until the countdown ends or the card
closes, so the note can be read; nothing SHALL be marked as alerted while it waits.

#### Scenario: Moved into the alert window
- **WHEN** a card is open for a 10:00 meeting with `leadSeconds` 900 and at 9:50 a refresh moves it to 10:05
- **THEN** the card shows "Moved to 10:05 - closing in 15 s" for its whole countdown, and the card for 10:05 opens within 5 seconds of the countdown ending, or of the user closing the note

#### Scenario: Another meeting falls due during the countdown
- **WHEN** a card counts down to close and another meeting falls due
- **THEN** the countdown runs to its end (or until the user closes the card), then the other meeting's card opens within 5 seconds

### Requirement: A card that cannot follow closes
When an open card cannot be updated (the overlay refuses the update), or the shell cannot tell
whether the card is still open, a change to its meeting SHALL close the card rather than leave the
old meeting on screen.

#### Scenario: The update is refused
- **WHEN** a refresh changes the meeting of an open card and the overlay refuses the update
- **THEN** the card closes

#### Scenario: No way to know if the card is open
- **WHEN** the shell offers no way to ask whether the card is open and a refresh changes the meeting of the card it opened
- **THEN** the card is hidden, and no card is opened for the change
