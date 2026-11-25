# Spec Delta

## MODIFIED Requirements

### Requirement: Pixel-art sprites
A sprite SHALL be defined as text in the theme. It SHALL have a palette that maps single
characters to colors (palette roles, hex colors, or transparent), and per phase one or more
frames of equal-length rows, at most 40x40 cells and at most 64 frames per phase; a theme
outside these limits SHALL have no sprite. A phase whose frame list is missing or empty SHALL
have no sprite of its own, and the other phases SHALL keep theirs, also after the theme travels
to the card. Each cell SHALL be drawn as a sharp,
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

#### Scenario: A phase without frames
- **WHEN** a user theme gives relaxed and angry frames, and tense an empty frame list
- **THEN** the card shows the sprite in relaxed and angry, and none in tense

#### Scenario: Largest sprite
- **WHEN** a user theme's frames are 40x40 cells
- **THEN** the card shows the sprite

#### Scenario: Sprite too large
- **WHEN** a user theme's frames are 41 cells wide
- **THEN** the card shows no sprite for that theme, and its colors and captions still apply

### Requirement: Animation grows with urgency
A phase with more than one frame SHALL cycle its frames at the phase's frame interval. A phase
SHALL be able to set `loopFrom`, the index of the first looped frame: its frames then play once
from the first, and after the last frame the cycle goes back to frame `loopFrom`, never to the
frames before it. A `loopFrom` that is missing, not a whole number, negative, or not below the
number of frames SHALL mean 0, so every frame loops. The frames SHALL start again from the first
whenever the card opens, the phase changes, or the theme in use changes (switching mode
included), and SHALL NOT start again when an open card is updated with new meeting details. A
theme SHALL be able to request a short shake in the angry phase: it SHALL come once when the
angry phase begins or the card opens already angry, or, when the phase's `loopFrom` is above 0,
instead once each time the frames reach `loopFrom` from the frame before it. Built-in playful themes SHALL keep a
single still frame in relaxed, animate slowly in tense and animate faster in angry. Animations
SHALL never flash the whole card.

#### Scenario: Still while relaxed
- **WHEN** a built-in playful theme is in the relaxed phase
- **THEN** the sprite does not move

#### Scenario: Escalation
- **WHEN** a built-in playful theme moves from tense to angry
- **THEN** the sprite's frames cycle faster than in tense, and the sprite shakes briefly once: at once when its angry phase has no `loopFrom`, or when the loop starts when it has one

#### Scenario: Intro then loop
- **WHEN** a phase has 7 frames and `loopFrom` 4
- **THEN** frames 0 to 6 play once, then frames 4, 5 and 6 repeat, and frames 0 to 3 do not show again while the phase lasts

#### Scenario: Invalid loopFrom
- **WHEN** a phase has 3 frames and `loopFrom` is 3, -1, 1.5 or `"2"`
- **THEN** all three frames loop, as with no `loopFrom`

#### Scenario: Shake when the loop starts
- **WHEN** the angry phase asks for a shake, has `loopFrom` 4, and begins on an open card
- **THEN** the sprite does not shake when the phase begins, and shakes once when frame 4 first shows

#### Scenario: Meeting update keeps the loop
- **WHEN** an angry card is in its laugh loop and the meeting's title or link changes in the calendar
- **THEN** the card shows the new details and the laugh loop goes on, with no intro and no shake

#### Scenario: Intro again after a mode switch
- **WHEN** an angry card is in its laugh loop and the user switches to professional and back to playful
- **THEN** the angry frames start again from the first, and the shake comes again when the loop starts

### Requirement: Playful layout
When the active theme has a sprite for the current phase, the sprite SHALL sit to the left of
the card's text. The card SHALL grow wider to make room, with an animated width, and the text
column SHALL keep the same width as in the layout without a sprite. The sprite SHALL be
centred vertically on the text from the top of the title to the bottom of the last line above
the buttons, but never placed above the top of the text column. The card SHALL be at least tall
enough to hold the sprite inside its padding.

#### Scenario: Switching to playful widens the card
- **WHEN** the user switches from `classic` to `marine` on an open card
- **THEN** the card widens smoothly, the sprite appears on the left, and the title wraps exactly as before

#### Scenario: Long title
- **WHEN** a playful card shows a title that wraps to three lines
- **THEN** the sprite moves down to stay centred between the top of the title and the caption, beside the countdown

#### Scenario: Sprite taller than the text
- **WHEN** the sprite is taller than the card's text column
- **THEN** the sprite starts at the top of the text column, and the card grows taller so the sprite stays inside it

### Requirement: Captions
A phase's caption, when defined, SHALL be shown on the card as plain text, never interpreted as
markup, on a single line that is elided when it does not fit and drawn within that line. The
caption SHALL be drawn in the card's text color, not in the phase color. Line
breaks, control characters, text-direction marks and zero-width spaces in a caption SHALL become
spaces, as in calendar text. Captions SHALL NOT replace the
meeting title, time, countdown or buttons.

#### Scenario: Ironic caption
- **WHEN** the `shiba` theme is in the angry phase
- **THEN** the card shows that phase's caption alongside the unchanged meeting details

#### Scenario: A caption with stacked marks
- **WHEN** a user theme's caption is a letter carrying sixty combining marks and a direction override
- **THEN** the caption is drawn within its line, in reading order, and does not cover the buttons

#### Scenario: Caption color when angry
- **WHEN** the angry phase shows a caption
- **THEN** the caption has the same color as the meeting title, while the countdown keeps the angry color
