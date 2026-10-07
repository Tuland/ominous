# Changelog

All notable changes to Ominous are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `joinHosts` in `ominous.json`: the meeting hosts where Join is selected first (subdomains
  included). The default holds 17 hosts of the main services, FaceTime included, each the
  narrowest host that covers the service's meeting links (`v.ringcentral.com`, not
  `ringcentral.com`); a recognized host means the service, not that the meeting is genuine.
  Your list replaces it, and other meeting hosts sit commented out in
  `omarchy-shell ominous config` and in the example file, ready to enable.
- A "?" with a tooltip next to Join when the link's host is not recognized, shown while Join is
  selected and on hover or click.
- `ominous.json` may hold `//` comments, a comma after the last item and a leading byte order
  mark, so an option can sit commented out until you want it; a file of only comments is the
  same as an empty one.
- Keys in `ominous.json` that Ominous does not use are named in `omarchy-shell ominous status`
  (`unknownKeys`) and in the shell log, so a misspelt key no longer does nothing in silence.
  Values it refuses (out of range, wrong type, an invalid `joinHosts` entry) are named in
  `ignoredValues` and the log. `status` also reports `configError` when the file cannot be read.
- `omarchy-shell ominous config` prints your complete config: every key with a one-line comment,
  your values and the defaults for the rest, so a key added by an update shows up. It only
  prints; Ominous still never writes `ominous.json`.
- `docs/ominous.example.jsonc` (every key at its default) and `docs/ominous.schema.json`, a JSON
  Schema that lets editors complete the keys and flag a wrong value.

### Changed
- **A link to a host that is not in `joinHosts` opens with Dismiss selected**, so `Enter` no
  longer opens it; choose Join on purpose. If you use a service outside the default, add its
  host to `joinHosts`.
- `leadSeconds` and `dim` set to `null`, `""` or a boolean no longer read as `0` or `1`: the
  default is used and `status` lists the value in `ignoredValues`.
- The Join button shows the host the browser really opens ("Join on evil.example"), not
  "Join on browser". A link such as `https://meet.google.com@evil.example/` is read as
  `evil.example`. A character outside plain ASCII in a host is shown as its `\uXXXX` escape, and
  the tooltip cuts a very long host, so a link cannot make the button or the tooltip lie.
- The card's first-second input guard now waits for a pause: a key pressed while the card is
  guarded starts the second again, so someone still typing when the card appears cannot join
  or dismiss it with a stray `Enter` or space.

### Security
- A meeting link that contains `$` is ignored. The browser is started through `systemd-run`,
  which expands `${VAR}` in its arguments, so a link such as
  `https://evil.example${HOME}@meet.google.com/` could be shown as Meet and open
  `evil.example`, or send environment values to the site. Links with a control character, a `%`
  escape in the host, or more than 2048 characters are ignored too.
- A meeting link with no host (`https:///example.com`) is no longer shown as a Join button, a
  host with anything but letters, digits, hyphens and dots is never recognized, and the title,
  place and calendar name are cut to one line (line breaks and text-direction overrides become
  spaces), so a calendar's owner cannot stretch the card or hide the host.
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
