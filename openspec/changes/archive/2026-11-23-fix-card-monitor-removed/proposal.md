# Proposal

## Why

The card opens on the monitor that has the focus and stays tied to it. On 2026-11-23 a real card
was on screen when that monitor was unplugged: the card vanished at once, on every workspace,
and did not come back when the monitor was plugged in again (under a new connector name). The
shell still counted Ominous open, so no window was shown and none was closed: the meeting alert
was lost until the card's own timer dismissed it at the meeting's end, or until a manual `hide`.
The shell's own overlays (`Ui/OverlayWindow.qml`) handle this case; Ominous does not.

## What Changes

- The card opens on the monitor that has the focus; when none matches, on the first monitor
  (today it gets no monitor and stays hidden).
- When the card's monitor is removed while the card is open, the card shows again on the
  monitor that has the focus, with the keyboard, its countdown and its phase unchanged.
- When a monitor is added, a card already on screen stays where it is. A card that has no
  monitor (all were removed) shows on the focused one as soon as one appears.
- While the card has no monitor it stays open for the shell (so the service does not forget
  its alert) but has no window, and it shows again as soon as a monitor is listed by both the
  shell and the compositor.
- `CHANGELOG.md` Unreleased (Fixed). No config key, IPC command or theme changes.

## Capabilities

### New Capabilities
- `alert-display`: which monitor the card appears on, and how it follows monitors that are
  removed or added while it is open.

### Modified Capabilities

(none)

## Impact

- `Logic.js`: a pure function that picks the card's monitor from the monitor names, the focused
  monitor and the current one; unit tests in `tests/`.
- `Alert.qml`: uses it in `open()` and on `Quickshell.screensChanged`; the window's `visible`
  requires a monitor; the keyboard focus is taken again after a move.
- Checks: unit tests; a manual check by the user (unplug and replug a monitor with a `test`
  card on screen), since an automated live test would have to switch the user's real monitors
  off.
- Ships in the next patch release (0.3.3) from `staging`; nothing goes to `main` while the
  marketplace review #14910 waits.
