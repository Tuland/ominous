# Changelog

All notable changes to Ominous are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security
- The calendar name on the card's top line is shown as plain text. Before, a name that looked
  like markup was rendered as rich text, so the owner of a shared calendar could make the card
  load an external image (`<img src="https://...">`) when an alert opened. Every text on the
  card is now plain text, and a test keeps it so.

## [0.2.0] - 2026-10-05

### Changed
- **New plugin ID: `io.github.tuland.ominous`** (was `tuland.ominous`), the namespaced form the
  Omarchy plugin marketplace asks for. If you installed 0.1.0, remove it with
  `omarchy plugin remove tuland.ominous`, then install again as the README shows. Your
  `ominous.json` and the `omarchy-shell ominous` commands stay the same.
- The plugin is now called "Ominous Meeting".
- The documentation moved from the README to `docs/`.

### Added
- Three phases: relaxed when the card appears, tense shortly before the start
  (`tenseSeconds`), angry once the meeting has started. Each has its own color.
- A playful mode with original pixel-art characters: `marine`, `shiba` and `boss`. Switch it on
  the card or with `M`; the choice is remembered.
- Themes as JSON files, shipped or your own in `~/.config/omarchy/ominous/themes/`. Choose them
  with `omarchy-shell ominous themes` and `theme <name> [mode]`, or with the `themes` key.
- `omarchy-shell ominous preview "<phase> <mode>"` holds the card in one phase.
- `onlyWithLink`: alert only for meetings with an `https://` join link.
- `mode`: the mode used until you first switch.

## [0.1.0] - 2026-10-05

### Added
- A big card in the middle of the focused monitor before each meeting, fed by OmaCal
  (`omacal agenda --json`). It stays until dismissed or until the meeting ends; Join opens the
  `https://` link.
- Configuration in `~/.config/omarchy/ominous.json`: `calendars`, `leadSeconds`, `dim`.
- `omarchy-shell ominous test` and `status`.

[Unreleased]: https://github.com/Tuland/ominous/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Tuland/ominous/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Tuland/ominous/releases/tag/v0.1.0
