# Spec Delta

## ADDED Requirements

### Requirement: Semi-transparent sprite cells
A palette color given as hex with an alpha channel (`#rrggbbaa`) SHALL be drawn over the
card's background at that opacity, so the card shows through the cell. A fully opaque hex color
SHALL cover the card as before.

#### Scenario: Half-transparent cell on a light card
- **WHEN** a user theme's palette maps a letter to `#00000080` and the card's background is light
- **THEN** those cells show a grey halfway between black and the card's background

#### Scenario: The same cell on a dark card
- **WHEN** the same theme is shown with a dark Omarchy theme
- **THEN** those cells take the darker blend of the dark background, not the light one's grey

### Requirement: Shipped themes flash at most twice a second
A shipped theme's sprite SHALL NOT flash more than twice in any window of as many frame steps as
fit in one second, over each phase as the card plays it (intro once, then the loop over and
over), on a light card and on a dark one, measured on the whole sprite and on each of its halves.
A flash is a pair of opposing changes of at least 0.1 in mean relative luminance, the darker
state below 0.8: a measure modelled on WCAG 2.3.1's general flash, with a stricter count, not a
full WCAG area analysis.

#### Scenario: A storm on a light card
- **WHEN** the shipped `shiba` theme plays its angry phase on a light card
- **THEN** no one-second window of its intro and loop holds more than two flashes

#### Scenario: Every shipped theme on both cards
- **WHEN** any shipped theme plays any phase on a light or a dark card
- **THEN** no one-second window holds more than two flashes

#### Scenario: A flash on half the sprite
- **WHEN** the top half of a sprite flashes and the bottom half stays dark, so the whole sprite's mean moves by less than 0.1
- **THEN** the flashes of the top half count against the limit

#### Scenario: Empty cells and window length
- **WHEN** a phase runs at 120 ms a frame and its sprite has empty cells
- **THEN** a window is 8 frame steps, and an empty cell counts as the card behind it
