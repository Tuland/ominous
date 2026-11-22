# Proposal

## Why

`tools/shoot-card.sh` summons a synthetic card straight through the shell, so the service does
not know about it: a real alert that falls due, or a calendar change to the agenda card the
service follows, can replace the synthetic card in the 1.6 seconds before the capture. The
capture then holds a real meeting, and `tools/make-preview.sh` builds `preview.png`, the picture
the marketplace publishes. Since `fix-0-3-1-manual-review`, `shoot-card.sh` also hides any card
on screen before its summon: a real alert that opens between two captures of
`make-preview.sh` or `tests/theme-check.sh` is hidden by the next one, after it was marked as
alerted, and is lost. Found by the reviews of the diff since 0.3.1; a developer working with
the tools knows the card is theirs for a moment, so real alerts may wait for that moment.

## What Changes

- New IPC command `omarchy-shell ominous hold <seconds>`: for that many seconds (whole, 1 to
  60) no real alert opens and the agenda card on screen is not changed by a refresh; `hold 0`
  ends the hold at once. Anything else is refused with a message. A new `hold` replaces the
  time left, so a caller renews it.
- The hold ends by itself when its time is up, inside the service: no release is needed, so a
  script or an agent that stops halfway cannot leave alerts off for more than 60 seconds. It
  lives in memory only: a shell restart ends it.
- While held, no meeting is marked as alerted. When the hold ends, a meeting whose alert window
  is still open alerts as usual; one whose window closed during the hold gets no card. The
  agenda card on screen, if any, is checked against the calendar once when the hold ends.
- `status` shows `holdSeconds`, the seconds left (0 without a hold).
- `test` and `preview` work during a hold; they neither start nor end it.
- One owner per tool run: `tools/shoot-card.sh` run alone holds, renews before each try, and on
  exit hides its card and then ends the hold; `tools/make-preview.sh` and `tests/theme-check.sh`
  own the hold for their whole run (they hold first and end it on exit) and `shoot-card.sh`
  only renews it. The owner prints one line on stderr when the hold starts and one when it ends.
  `shoot-card.sh` stops with a message when the running plugin answers anything but `ok`, and
  when a card is on screen as it starts, instead of hiding it.
- `CLAUDE.md`: before holding alerts, by hand or through any of these tools, an agent says so;
  afterwards it checks with `status` that `holdSeconds` is 0.
- `docs/usage.md` (commands), `docs/development.md` (the tools), `CHANGELOG.md` Unreleased.

## Capabilities

### New Capabilities

- `alert-hold`: holding real alerts for a bounded time, and how alerts and the agenda card
  behave during and after a hold.

### Modified Capabilities

## Impact

`Logic.js` (parsing the command, the hold decision), `Service.qml` (the IPC function, the gates
in `tick()` and `follow()`, `status`), `tools/shoot-card.sh`, `tools/make-preview.sh`,
`tests/theme-check.sh`, `tests/agenda.test.mjs`, `tests/live.sh`, `docs/usage.md`,
`docs/development.md`, `CLAUDE.md`, `CHANGELOG.md`. Builds on `fix-0-3-1-manual-review`
(`Logic.holdsAlerts`, the closing-card wait in `tick()`); both ship in 0.3.2. No config key, no
file written, no packaging change.
