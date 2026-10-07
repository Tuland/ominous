## MODIFIED Requirements

### Requirement: Pixel-art sprites
A sprite SHALL be defined as text in the theme. It SHALL have a palette that maps single
characters to colors (palette roles, hex colors, or transparent), and per phase one or more
frames of equal-length rows, at most 32x32 cells and at most 64 frames per phase; a theme
outside these limits SHALL have no sprite. Each cell SHALL be drawn as a sharp,
whole-pixel square with no smoothing, so the art stays crisp at any shell scale. Characters not
in the palette SHALL be drawn transparent.

#### Scenario: Crisp rendering
- **WHEN** a 16x16 sprite is shown at any shell spacing scale
- **THEN** every cell is the same whole number of pixels on each side, with no blurred edges

#### Scenario: Palette follows the Omarchy theme
- **WHEN** a sprite's palette uses the `urgent` role and the Omarchy theme changes
- **THEN** those cells take the new theme's urgent color

#### Scenario: Too many frames
- **WHEN** a user theme has 20000 frames in one phase
- **THEN** the card shows no sprite for that theme, and its colors and captions still apply

### Requirement: Captions
A phase's caption, when defined, SHALL be shown on the card as plain text, never interpreted as
markup, on a single line that is elided when it does not fit and drawn within that line. Line
breaks, control characters, text-direction marks and zero-width spaces in a caption SHALL become
spaces, as in calendar text. Captions SHALL NOT replace the
meeting title, time, countdown or buttons.

#### Scenario: Ironic caption
- **WHEN** the `shiba` theme is in the angry phase
- **THEN** the card shows that phase's caption alongside the unchanged meeting details

#### Scenario: A caption with stacked marks
- **WHEN** a user theme's caption is a letter carrying sixty combining marks and a direction override
- **THEN** the caption is drawn within its line, in reading order, and does not cover the buttons
