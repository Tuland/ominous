# Tasks

## 1. Decision in Logic.js

- [x] 1.1 `Logic.js`: `pickScreen(names, focusedName)` returning an index or -1 (design decision 1): the focused one, else 0, -1 for an empty list; JSDoc, typed, index line. Unit tests in `tests/card.test.mjs`: the focus listed at an index other than 0, the focus not listed (0), focus null (0), empty list (-1). Verify: `mise exec -- tests/run.sh --unit` passes

## 2. The card follows its monitor

- [x] 2.1 `Alert.qml`: `open()` picks the monitor with `Logic.pickScreen`, so an unmatched focus falls back to the first monitor; a `targetMonitor` property and `visible: root.opened && root.targetScreen !== null && root.targetMonitor !== null` (design decision 3); a `Connections` on `Quickshell` `onScreensChanged` calling one typed, documented function that, while open and when `Quickshell.screens.indexOf(targetScreen) < 0`, sets it to `null` and in `Qt.callLater` returns when the card is closed or `targetScreen` is set again, else picks with `pickScreen` (-1 to `null`) (design decision 2); the window's `onVisibleChanged`, when it turns true, sets `guardKeyMs` to now at once and runs a `Qt.callLater` that, if still visible, takes the keyboard (`keyCatcher.forceActiveFocus()`); `openedAtMs` and `closesAtMs` untouched (design decision 4). Verify: `mise exec -- tools/lint.sh` and `tests/style.test.mjs` pass; `mise exec -- tests/run.sh --live --restart` passes (the card still opens and closes as before)
- [x] 2.2 `docs/usage.md`: one line that a card whose monitor is unplugged moves to the focused one and stays there when the monitor returns, even when the workspaces go back to it. `docs/development.md`, security map row "Keys while the card opens": input is also ignored for a second after the card moves to another monitor. `CHANGELOG.md` Unreleased, Fixed: the card vanished, still open, when its monitor was unplugged. Verify: `tests/docs.test.mjs` passes

## 3. Checks

- [x] 3.1 Manual check by the user, with the agent guiding: with a `omarchy-shell ominous test` card on the external monitor, unplug it (the card appears on the laptop within a second; keys during the first second do nothing, then Esc closes it), run `test` again with the monitor unplugged and plug it back (the card stays on the laptop), and run `test` once more (it opens on the focused monitor). Afterwards `omarchy-shell shell call io.github.tuland.ominous guardedNow ""` prints `unknown` and `hyprctl layers` shows no `ominous-alert`. Not checked by hand: every monitor removed (the unit test of `pickScreen` with an empty list, plus design decision 2) and a dismiss or a new summon before the callback runs (the callback's contract in design decision 2, checked in the Review)
- [x] 3.2 `mise exec -- tests/run.sh` passes (unit, art, lint, live), and no unexpected `ominous:` error lines in `journalctl --user -o cat --since` the run's start

## 4. Review

- [x] 4.1 Code review and security review of this change's diff, in a separate context (a fresh Cursor reviewer through herdr, briefed read-only, no network, no `gh` or `curl`; its commands checked in the transcript afterwards), against the proposal, the spec, the design and the Security section of `docs/development.md`; fix the findings or take them to the user

## Workflow follow-up

- Commit on `staging` when the user asks; nothing on `main` while #14910 waits; release as 0.3.3 afterwards.
