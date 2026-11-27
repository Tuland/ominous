# Spec Delta

## MODIFIED Requirements

### Requirement: Built-in themes
The plugin SHALL ship four themes:
- `classic`: professional; no sprite and no captions; colors from the Omarchy palette roles;
  progress bar enabled.
- `marine`: playful; an original pixel face in the spirit of 90s FPS status bars.
- `shiba`: playful; an original pixel shiba with doge-style captions.
- `boss`: playful; an original pixel office manager in a suit, with office-jargon captions.

Each playful theme SHALL have three distinct expressions, one per phase, and a caption per
phase. All built-in art SHALL be original, and no built-in theme SHALL use a third-party name
or trademark.

#### Scenario: Built-in themes available
- **WHEN** `themes.playful` is `shiba`, `marine` or `boss` and no user theme of that name exists
- **THEN** the shipped theme is used

#### Scenario: The boss keeps its colors under any Omarchy theme
- **WHEN** the shipped `boss` theme is shown under two Omarchy themes with different accent and urgent colors
- **THEN** its palette names no theme role, its opaque cells have the same colors under both, and its semi-transparent cells blend over each card as semi-transparent cells do
