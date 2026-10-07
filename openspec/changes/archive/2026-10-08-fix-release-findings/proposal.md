# Proposal

## Why

The release review and the whole-code security audit of 0.3.0, each run in a separate context,
found faults that stop the release (the `ominous-release` skill: a finding not fixed stops it).
The worst: anyone can send invitations, Google adds them to the calendar until they are
declined, and Ominous opens one card per event, one every 5 seconds, each taking the screen and
the keyboard. Others: a link containing `--private` is rewritten by `omarchy-launch-browser`, so
the host shown is not the host opened; a key name inside `themes` is printed unescaped and
breaks the `config` round trip; a key pressed just after the guard's pause can be swallowed; an
unreadable `ominous.json` does not set `configError`.

## What Changes

- **One card per group of meetings**: when an alert fires, every alertable event the user has
  not accepted or organized that starts within the next minute is marked as alerted too. A
  flood of invitations gives at most one card a minute, however its starts are spread; a
  meeting the user accepted or organizes always gets its own card, and goes first.
- A link containing `--private` is no link: `omarchy-launch-browser` replaces the first
  `--private` inside every argument, the URL included, with the browser's private flag.
- Nested `themes` key names are escaped where they are reported (`ignoredValues`, the log, the
  header of `config`), so the output of `config` always reads back.
- The input guard is checked against the time of the key or click itself, not the last 250 ms
  tick.
- An `ominous.json` that exists but cannot be read (permissions, a directory) sets `configError`;
  a missing file still does not.
- Theme captions are cleaned like calendar text (`cleanText`) and clipped to their line; a theme
  with more than 64 frames in a phase has no sprite.
- An event whose start is not a finite date that `Date` can hold is not alertable, so `status`
  cannot throw.
- `normalizePayload` applies the config's ranges to `dim`, `leadSeconds` and `tenseSeconds`.
- Wording and docs: the tooltip says "characters outside plain ASCII" instead of "non-Latin";
  the changelog entry on `dim: null` is corrected; the schema accepts what Ominous accepts
  (decimal seconds, numbers in `calendars`); the CI header and the release skill
  (`mise exec --`) are brought up to date; `tests/theme-check.sh` stops if the copy of the
  current theme fails; the Security map in `docs/development.md` gains the alert volume, the
  `--private` rewrite, the uwsm chain, the payload ranges and the theme rules, and the list of
  APIs not allowed gains `Qt.createComponent`, `Qt.include`, `FontLoader`, `BorderImage`,
  `AnimatedSprite`, `MediaPlayer`, `Video` and `SoundEffect`.
- A test that the log lines of `Service.qml` never print a title or a place.

## Capabilities

### New Capabilities

### Modified Capabilities

- `meeting-selection`: one card per group of unconfirmed meetings starting within a minute; an event
  without a usable start is not alertable.
- `untrusted-input`: a link with `--private` is no link; the input guard uses the time of the
  input.
- `configuration`: an unreadable file sets `configError`; nested key names are escaped.
- `alert-themes`: captions are cleaned and clipped; a sprite has at most 64 frames per phase.

## Impact

`Logic.js` (`claimDue`, `isAlertable`, `safeUrl`, `checkConfig`, `normalizeTheme`,
`normalizeSprite`, `normalizePayload`, `unknownLinkTip`, `CONFIG_FIELDS`), `Alert.qml`,
`Service.qml`, the unit tests, `tests/theme-check.sh`, `docs/`, the generated
schema, `CHANGELOG.md`, `.github/workflows/tests.yml` (comment), the release skill.
