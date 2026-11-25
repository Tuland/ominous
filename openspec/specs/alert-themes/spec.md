# alert-themes Specification

## Purpose
Lets the alert card be dressed by interchangeable themes: a professional look and a playful
look with pixel-art characters and ironic captions. A small switch on the card swaps between
them and the choice is remembered.

## Requirements

### Requirement: Theme files
A theme SHALL be a JSON file named `<name>.json`. For each phase (relaxed, tense, angry) it
SHALL be able to define:
- a signal color, given as an Omarchy palette role (`accent`, `urgent`, `foreground`, `muted`,
  `background`) or as a hex color;
- an optional caption;
- an optional sprite.

A theme SHALL also be able to enable the progress bar. Themes SHALL be looked up first in
`~/.config/omarchy/ominous/themes/` and then among the themes shipped with the plugin, so a
user theme with the same name overrides a built-in one. A missing phase color SHALL fall back
to the default for that phase: accent for relaxed, a blend of accent and urgent for tense,
urgent for angry. When the user themes folder does not exist, the service SHALL create it at
start and SHALL watch it from then on, without a restart.

#### Scenario: User theme overrides a built-in one
- **WHEN** `~/.config/omarchy/ominous/themes/marine.json` exists
- **THEN** the playful mode with theme `marine` uses the user's file, not the built-in one

#### Scenario: Missing phase color
- **WHEN** a theme defines no color for the tense phase
- **THEN** the tense phase uses the default tense color

#### Scenario: First start without the themes folder
- **WHEN** the shell starts with no `~/.config/omarchy/ominous/themes/` folder, and the user
  later saves `marine.json` there
- **THEN** the folder exists after start, no error is logged, and the playful mode with theme
  `marine` uses the user's file without a restart

### Requirement: Broken themes never break the alert
A theme that cannot be found, cannot be read or is not valid JSON SHALL be replaced by the
built-in default for its mode: `classic` for professional, `marine` for playful. The failure
SHALL be reported by the `status` IPC in a theme error field, separate from the agenda error. An invalid sprite SHALL be dropped and
the rest of the theme SHALL still apply. The alert SHALL always open.

#### Scenario: Unknown theme name
- **WHEN** `themes.playful` names a theme that does not exist and the mode is playful
- **THEN** the card opens with the built-in `marine` theme and `status` reports the missing theme

#### Scenario: Malformed sprite
- **WHEN** a theme's sprite has frames of different sizes
- **THEN** the card shows no sprite for that theme, and its colors and captions still apply

### Requirement: Professional and playful modes
The card SHALL have two modes, professional and playful. Each mode SHALL use the theme named
by `themes.professional` (default `classic`) or `themes.playful` (default `marine`) in
`ominous.json`. `mode` in `ominous.json` SHALL set the mode used before the user has ever
toggled the switch (default `professional`).

#### Scenario: Defaults
- **WHEN** `ominous.json` sets none of `mode`, `themes.professional` and `themes.playful`
- **THEN** the card opens in professional mode with the `classic` theme

#### Scenario: Choosing the playful theme
- **WHEN** `themes.playful` is `shiba` and the mode is playful
- **THEN** the card uses the `shiba` theme

### Requirement: Mode switch on the card
The card SHALL show a small switch for the mode. The switch SHALL be visually subdued at rest
and SHALL NOT draw attention away from the meeting details. A click on the switch or the `M` key
SHALL toggle the mode. The switch SHALL NOT be part of the Join/Dismiss keyboard cycle, and
toggling it SHALL NOT change which button is selected. The first-second input guard SHALL apply
to the switch as it applies to the buttons. Toggling SHALL restyle the open card at once,
without closing it.

#### Scenario: Toggle with the keyboard
- **WHEN** the card has been open for more than a second and the user presses `M`
- **THEN** the mode flips, the card restyles in place, and the selected button is unchanged

#### Scenario: Guarded toggle
- **WHEN** the user presses `M` within the first second after the card opens
- **THEN** nothing happens

#### Scenario: Tab skips the switch
- **WHEN** the user presses Tab on a card with a meeting link
- **THEN** the selection moves between Join and Dismiss only

### Requirement: Mode persists
Toggling the switch SHALL save the mode to `~/.local/state/ominous/state.json` and SHALL NOT
modify `ominous.json`. A saved mode SHALL take precedence over `mode` in `ominous.json` and
SHALL survive shell restarts. If saving fails, the open card SHALL still switch mode and the
failure SHALL be written to the shell log.

#### Scenario: Mode remembered across alerts
- **WHEN** the user switches to playful and a later alert opens after a shell restart
- **THEN** the later alert opens in playful mode

#### Scenario: Config untouched
- **WHEN** the user toggles the mode
- **THEN** `ominous.json` is byte-for-byte unchanged

#### Scenario: Reset to config
- **WHEN** the state file is deleted
- **THEN** the next alert uses `mode` from `ominous.json`

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

### Requirement: Built-in themes
The plugin SHALL ship four themes:
- `classic`: professional; no sprite and no captions; colors from the Omarchy palette roles;
  progress bar enabled.
- `marine`: playful; an original pixel face in the spirit of 90s FPS status bars.
- `shiba`: playful; an original pixel shiba with doge-style captions.
- `boss`: playful; an original pixel executive in a suit, with office-jargon captions; the tie
  takes the Omarchy accent color, and the urgent color when angry.

Each playful theme SHALL have three distinct expressions, one per phase, and a caption per
phase. All built-in art SHALL be original, and no built-in theme SHALL use a third-party name
or trademark.

#### Scenario: Built-in themes available
- **WHEN** `themes.playful` is `shiba`, `marine` or `boss` and no user theme of that name exists
- **THEN** the shipped theme is used

### Requirement: Status reports mode and themes
`omarchy-shell ominous status` SHALL include the active mode and the configured theme for each
mode. It SHALL still never print meeting titles.

#### Scenario: Status output
- **WHEN** the user runs `omarchy-shell ominous status` with the mode set to playful
- **THEN** the JSON includes the mode `playful` and both theme names, and no meeting title

### Requirement: Theme commands
`omarchy-shell ominous themes` SHALL list every theme available: the files in
`~/.config/omarchy/ominous/themes/` and those shipped with the plugin. For each theme it SHALL
say where the theme comes from (a user file overriding a shipped one says so) and which mode
uses it. `omarchy-shell ominous theme "<name> [professional|playful]"` SHALL make that theme the
one the mode uses, playful when no mode is given. The choice SHALL be saved to
`~/.local/state/ominous/themes.json`, SHALL take precedence over `themes` in `ominous.json` and
SHALL apply from the next alert. `ominous.json` SHALL NOT be modified. An unknown or invalid
name SHALL be refused with the list of available themes, and nothing SHALL be saved.
`theme "reset [professional|playful]"` SHALL drop the saved choice for that mode, or for both
when no mode is given, so `ominous.json` applies again.

#### Scenario: Listing themes
- **WHEN** the user runs `omarchy-shell ominous themes` with no user themes and the default config
- **THEN** the output lists `boss`, `classic` (used by professional), `marine` (used by playful) and `shiba`, all shipped

#### Scenario: Switching to the dog
- **WHEN** the user runs `omarchy-shell ominous theme shiba`
- **THEN** the next playful alert uses `shiba`, `status` reports `shiba` for playful, and `ominous.json` is unchanged

#### Scenario: Choosing a mode
- **WHEN** the user runs `omarchy-shell ominous theme "marine professional"`
- **THEN** the professional mode uses `marine` and the playful mode keeps its theme

#### Scenario: Unknown theme
- **WHEN** the user runs `omarchy-shell ominous theme poodle`
- **THEN** the command answers that there is no such theme, lists the available ones, and nothing changes

#### Scenario: Back to the config
- **WHEN** the user runs `omarchy-shell ominous theme reset`
- **THEN** both modes use the themes named in `ominous.json` again, or the defaults
