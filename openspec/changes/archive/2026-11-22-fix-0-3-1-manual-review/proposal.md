# Proposal

## Why

A marketplace maintainer reviewed `97ab746` (the 0.3.1 update request) by hand and withheld
approval over four findings. Two concern developer tools that touch the user's real session
(`tests/live.sh` backups, `tools/shoot-card.sh` captures); the other two concern the plugin: a
card already on screen keeps the meeting data it opened with when the calendar changes (so Join
can open a link the calendar no longer holds), and the agenda refresh reads OmaCal's whole output
into the shell with no limit. The update is published only when the findings are addressed.

The two tool findings were fixed by the change `guard-live-test-tools` (archived on 2026-11-20
but never committed): checked backups and a restore that copies over what the checks left in
`tests/live.sh`, and a check that the card's layer is on the captured monitor in
`tools/shoot-card.sh`. Two gaps remain next to those fixes, and the two plugin findings are
untouched.

## What Changes

- `tests/live.sh`: the comment on `cleanup()` states the limit that remains (a file the user
  creates or edits during the run is removed or put back) and why it is kept; a file that cannot
  be removed keeps the backup folder and prints its path; the restore renames a temporary copy
  over each file, so a symlink put there during the run is replaced, not written through.
- `tools/shoot-card.sh`: the capture is refused unless the trimmed card keeps clear of all four
  edges of the monitor, so a capture where the veil is not opaque yet (the desktop showing)
  cannot pass.
- **A card on screen follows the calendar and says what changed.** After each refresh, while
  the card is open for an agenda alert:
  - title, end, place, calendar or link changed: the card updates in place and shows
    "Changed in your calendar: title, link" (the fields that changed); the selection follows
    the usual rule for the new link and the input guard restarts;
  - removed from the calendar, declined, or no longer alerting: the card shows "Removed from
    your calendar" or "Declined in your calendar" with a 15-second countdown, hides Join, and
    closes at the end of it; Esc or Dismiss close it at once;
  - moved to another start (not part of a recurring series): "Moved to 15:00" with the same
    15-second countdown and the old values, then the card closes; the meeting alerts again for
    its new start, if that start is still ahead, as any meeting does;
  - a card the user dismissed never reopens, and `test` and `preview` cards are never changed
    by a refresh.
- The agenda refresh accepts at most 1 MiB of OmaCal's output; the shell never holds more than
  1 MiB and one byte of it. A larger output is refused as an error (`status` shows it in
  `lastError`, the log names it) and the events read before stay in use.
- `docs/usage.md`, `docs/development.md` (security map), `CHANGELOG.md` Unreleased.

## Capabilities

### New Capabilities

### Modified Capabilities

- `untrusted-input`: requirements for a bounded agenda read and for an open card that follows
  the calendar (changed, removed or declined, moved).

## Impact

`Service.qml`, `Alert.qml`, `Logic.js`, `tests/agenda.test.mjs`, `tests/payload.test.mjs`,
`tests/live.sh`, `tools/shoot-card.sh`, `docs/usage.md`, `docs/development.md`, `CHANGELOG.md`.
The uncommitted `guard-live-test-tools` diff and its archive folder are committed together with
this change. The overlay payload gains an optional `notice` field, checked again by the overlay
like every other field. No config key, IPC command or packaging change. Needs `bash` and `head`
at run time, both part of the base system Omarchy runs on.
