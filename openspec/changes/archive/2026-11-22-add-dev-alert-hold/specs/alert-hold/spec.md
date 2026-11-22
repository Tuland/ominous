# Spec Delta

## Purpose
Defines the `hold` command, which holds real alerts for a bounded time during development
captures, and how alerts and the agenda card behave during and after a hold.

## ADDED Requirements

### Requirement: Holding alerts for a bounded time
The `hold` IPC command SHALL take a whole number of seconds from 1 to 60 and, for that long,
open no card for a real alert and leave the agenda card on screen unchanged by refreshes.
`hold 0` SHALL end a hold at once. Any other argument SHALL be refused with a message and SHALL
leave the current hold as it is. A new `hold` SHALL replace the time left.

#### Scenario: A hold
- **WHEN** the user runs `omarchy-shell ominous hold 30` and a meeting falls due 10 seconds later
- **THEN** the command prints `ok`, and no card opens for that meeting during the 30 seconds

#### Scenario: Ended early
- **WHEN** a hold runs and the user runs `omarchy-shell ominous hold 0`
- **THEN** the hold ends, and a meeting that is due alerts within 5 seconds

#### Scenario: Renewed
- **WHEN** the user runs `hold 60` and, 50 seconds later, `hold 60` again
- **THEN** the hold lasts until 60 seconds after the second command

#### Scenario: Refused arguments
- **WHEN** the user runs `hold` with `61`, `-1`, `1.5`, `abc` or nothing
- **THEN** the command prints why it refused, and a hold already running keeps its time

### Requirement: A hold ends by itself
A hold SHALL end when its time is up without any further command, and SHALL NOT outlive the
shell: after a shell restart no hold is running. A hold SHALL NOT be written to any file.

#### Scenario: Time up
- **WHEN** the user runs `hold 2` and nothing else
- **THEN** `status` shows `holdSeconds` 0 three seconds later, and alerts open again

#### Scenario: The caller stops halfway
- **WHEN** a script runs `hold 30` and is killed before it ends the hold
- **THEN** alerts open again at most 30 seconds after the hold began

#### Scenario: Shell restart
- **WHEN** a hold runs and the shell restarts
- **THEN** `status` shows `holdSeconds` 0

### Requirement: Alerts during a hold
While a hold runs, no meeting SHALL be marked as alerted. When the hold ends, a meeting whose
alert window is still open SHALL alert as usual; a meeting whose window closed during the hold
SHALL get no card. `test` and `preview` SHALL work during a hold and SHALL neither start nor end
it.

#### Scenario: Due during the hold
- **WHEN** a meeting with `leadSeconds` 60 falls due during `hold 60`
- **THEN** its card opens within 5 seconds of the end of the hold

#### Scenario: Test during a hold
- **WHEN** a hold runs and the user runs `omarchy-shell ominous test`
- **THEN** the test card opens, and `status` still shows the hold's seconds left

### Requirement: The agenda card across a hold
During a hold, a refresh SHALL NOT change or close the agenda card on screen, but a card that
the user or a tool closed SHALL be forgotten as usual. When the hold ends, the agenda card still
on screen SHALL be checked against the newest agenda once, as after a refresh.

#### Scenario: Changed during the hold
- **WHEN** an agenda card is open, the user runs `hold 30`, and a refresh changes the meeting's link
- **THEN** the card keeps the old link until the hold ends, then shows "Changed in your calendar: link" with the new one

#### Scenario: Closed during the hold
- **WHEN** an agenda card is open, a hold runs, and the card is hidden before the hold ends
- **THEN** no card opens for that meeting when the hold ends

### Requirement: The hold in status
`status` SHALL show `holdSeconds`, the whole seconds left in the hold, rounded up, and 0 when
no hold runs.

#### Scenario: During a hold
- **WHEN** the user runs `hold 30` and then `status`
- **THEN** `holdSeconds` is 30 or a little less, never more

#### Scenario: Without a hold
- **WHEN** no hold runs
- **THEN** `status` shows `holdSeconds` 0
