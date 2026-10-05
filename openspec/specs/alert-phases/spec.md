# alert-phases Specification

## Purpose
Paces the meeting alert through three phases — relaxed, tense, angry — so the card shows at a
glance how close the meeting is, or how late the user already is.

## Requirements

### Requirement: Three alert phases
The alert SHALL be in exactly one phase at any time, derived from the meeting start, the
current time and `tenseSeconds`:
- **relaxed** while `now < start - tenseSeconds`;
- **tense** while `start - tenseSeconds <= now < start`;
- **angry** while `now >= start`.

The phase SHALL be re-evaluated while the card is open, so it advances without user action.

#### Scenario: Card opens relaxed
- **WHEN** an alert opens 60 seconds before the start with `tenseSeconds` 15
- **THEN** the card is in the relaxed phase

#### Scenario: Tense begins at the threshold
- **WHEN** the card is open and the time reaches 15 seconds before the start with `tenseSeconds` 15
- **THEN** the card switches to the tense phase

#### Scenario: Angry begins at the start
- **WHEN** the card is open and the time reaches the meeting start
- **THEN** the card switches to the angry phase and stays in it until it closes

#### Scenario: Late alert skips earlier phases
- **WHEN** an alert opens 30 seconds after the meeting started (inside the grace window)
- **THEN** the card opens directly in the angry phase

#### Scenario: Tense threshold longer than the lead time
- **WHEN** `leadSeconds` is 10 and `tenseSeconds` is 15
- **THEN** the card opens directly in the tense phase

### Requirement: Tense threshold is configurable
`ominous.json` SHALL accept `tenseSeconds`, an integer from 0 to 3600, default 15. A missing or
invalid value SHALL fall back to the default. A value of 0 SHALL skip the tense phase.

#### Scenario: Default threshold
- **WHEN** `ominous.json` does not set `tenseSeconds`
- **THEN** the tense phase begins 15 seconds before the start

#### Scenario: Invalid threshold
- **WHEN** `tenseSeconds` is `-3` or `"soon"`
- **THEN** the default of 15 seconds is used

#### Scenario: Tense phase disabled
- **WHEN** `tenseSeconds` is 0
- **THEN** the card goes from relaxed straight to angry at the start

### Requirement: Phase signal color
Each phase SHALL have a signal color, defined by the active theme. The countdown, the selected
button and the progress bar SHALL use it. A change of phase SHALL animate the color instead of
switching it abruptly. The angry color SHALL read as an alarm. Built-in themes SHALL use the
Omarchy theme's urgent color for angry.

#### Scenario: Colors follow the phase
- **WHEN** the card moves from relaxed to tense to angry
- **THEN** the countdown takes each phase's signal color in turn, with an animated transition

#### Scenario: Colors follow the Omarchy theme
- **WHEN** the Omarchy theme changes and a built-in theme is active
- **THEN** the phase colors follow the new theme's accent and urgent colors

### Requirement: Progress bar
When the active theme enables it, the card SHALL show a thin progress bar along its bottom
edge, inside the card. The bar SHALL NOT change the card's size. The bar's fill is:
- before the start: the share of the lead time already elapsed, from 0 when the card's
  window opens to 1 at the start;
- in the angry phase: the share of the meeting already elapsed, from start to end.

A meeting with no end time SHALL show a full bar in the angry phase. A `leadSeconds` of 0 SHALL
show a full bar before the start. The fill SHALL be clamped to the 0..1 range.

#### Scenario: Bar fills toward the start
- **WHEN** `leadSeconds` is 60 and the start is 15 seconds away
- **THEN** the bar is three quarters full, in the tense color

#### Scenario: Bar measures the missed meeting
- **WHEN** a 30-minute meeting started 6 minutes ago
- **THEN** the bar is one fifth full, in the angry color

#### Scenario: Theme without a bar
- **WHEN** the active theme does not enable the progress bar
- **THEN** no bar is drawn and the card looks as it does without one
