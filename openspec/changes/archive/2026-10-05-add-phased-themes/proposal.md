# Proposal

## Why

The alert card looks the same from the moment it appears until the meeting ends: only the
countdown text changes, and its color switches once, at the start. The card does not show how
urgent the meeting is. The plugin is called Ominous, but nothing on the card is ominous yet.
Pacing the card through clear phases makes urgency readable at a glance. A playful mode gives
the plugin the personality its name promises, and a professional mode stays available for
screens that other people can see.

## What Changes

- The alert passes through three phases:
  - **relaxed**: from the moment the card appears;
  - **tense**: the last `tenseSeconds` before the start;
  - **angry**: once the meeting has started.
  
  An alert that opens late, inside the grace window, starts directly in the phase that
  matches the current time.
- Each phase has its own signal color: the countdown, the selected button and the progress
  bar use it.
- Themes are JSON files that define, for each phase, a color, an optional ironic caption and
  an optional pixel-art sprite with animation frames. Themes come with the plugin (`themes/`)
  or live in `~/.config/omarchy/ominous/themes/`.
- There are two modes, **professional** and **playful**. Each mode maps to a theme chosen in
  `ominous.json` (`themes.professional`, `themes.playful`). `mode` sets the initial mode.
- A small, unobtrusive switch on the card changes the mode while the card is open. The choice
  persists across alerts and restarts in `~/.local/state/ominous/state.json`. The plugin never
  rewrites `ominous.json`.
- Built-in themes:
  - `classic` (professional): no sprite. Phase colors come from the Omarchy theme roles. A
    thin progress bar runs along the bottom edge of the card.
  - `marine` (playful): an original 90s-FPS-style face.
  - `shiba` (playful): an original shiba with doge-style captions.

  Every character is drawn from scratch. No third-party art, names or trademarks are used.
- In playful mode the sprite sits to the left of the text, and the card widens to make room
  for it.
- `omarchy-shell ominous status` also reports the active mode and the configured themes.

## Capabilities

### New Capabilities
- `alert-phases`: the three alert phases, the moment each one begins, and how each phase
  shows on the card (signal color, progress bar).
- `alert-themes`: theme files, the professional/playful modes, the persistent mode switch,
  the pixel-art sprites and their animation, and the captions.

### Modified Capabilities
None. No main specs exist yet.

## Impact

- `Logic.js`: phase computation, config normalization for the new keys, theme validation,
  and progress fractions. All of it is pure and covered by `tests/logic.test.mjs`.
- `Alert.qml`:
  - phase-driven colors;
  - the mode switch (`Ui/ToggleSwitch` from the shell kit);
  - the sprite renderer, the caption and the progress bar;
  - the state file read and write;
  - the card width animation.
- `Service.qml`: new config keys in the payload, and the mode in the `status` IPC output.
- New files: `themes/classic.json`, `themes/marine.json`, `themes/shiba.json`.
- Documentation: a short `README.md` with an index into `docs/` (usage, themes, configuration,
  making a theme, development), including a credits line ("a nod to…").
- No new dependencies.
