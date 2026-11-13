## MODIFIED Requirements

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
