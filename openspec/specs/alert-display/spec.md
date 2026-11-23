# alert-display Specification

## Purpose
Decides which monitor the card appears on, and how an open card follows monitors that are
removed or added, so it is on screen whenever a monitor is connected.

## Requirements

### Requirement: Monitor of a new card
When the card opens, it SHALL appear on the monitor that has the keyboard focus. When no
monitor matches the focused one, it SHALL appear on the first monitor the shell lists.

#### Scenario: Focused monitor
- **WHEN** two monitors are connected, the focus is on the external one, and an alert fires
- **THEN** the card appears on the external monitor

#### Scenario: Focused monitor unknown
- **WHEN** an alert fires while the compositor reports no focused monitor, or one the shell does not list
- **THEN** the card appears on the first monitor the shell lists

### Requirement: Card's monitor removed
When the monitor showing the card is removed while the card is open, the card SHALL appear on
the monitor that has the focus, or on the first one listed, within a second. It SHALL keep its
meeting, countdown, phase, selected button and mode, take the keyboard again, and ignore input
for the same time as a card that has just opened.

#### Scenario: Monitor unplugged
- **WHEN** a card is on the external monitor and that monitor is unplugged, leaving only the laptop screen
- **THEN** the card appears on the laptop screen, and Enter and Esc act on it once the input guard is over

#### Scenario: Unplugged with two monitors left
- **WHEN** a card is on one of three monitors and that monitor is unplugged
- **THEN** the card appears on the monitor that has the focus, or on the first one listed when the focused one is not known

#### Scenario: Typing when the card reappears
- **WHEN** the user is typing on the laptop and the card reappears there
- **THEN** the keys pressed during the input guard neither join nor dismiss the meeting

#### Scenario: Monitor plugged back
- **WHEN** the card moved to the laptop screen and the external monitor is plugged in again, under the same or another connector name
- **THEN** the card stays on the laptop screen

### Requirement: No open card without a monitor
While no monitor is connected the card SHALL stay open but hidden, and it SHALL appear on the
focused monitor, or on the first one listed, as soon as a monitor is connected. Adding a
monitor SHALL NOT move a card that is already on screen.

#### Scenario: Every monitor removed
- **WHEN** a card is open and every monitor is removed, then one is connected
- **THEN** the card appears on the connected monitor, with the input guard, unless its meeting ended meanwhile

#### Scenario: A second monitor added
- **WHEN** a card is on the laptop screen and an external monitor is connected
- **THEN** the card stays on the laptop screen
