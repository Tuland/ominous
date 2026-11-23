# Design

## Context

`Alert.qml` picks the card's monitor once, in `open()`, by matching `Hyprland.focusedMonitor`
against `Quickshell.screens`, and gets `null` when nothing matches. The `PanelWindow`'s
`visible` follows only `opened`. When the monitor goes away, Quickshell destroys its screen
object and the compositor closes the layer surface; nothing in Ominous reacts, so `opened` stays
true and the shell keeps the overlay loaded with no window (seen on 2026-11-23: no
`ominous-alert` layer, `shell call ... guardedNow` answered `false`, not `unknown`).

The shell's `Ui/OverlayWindow.qml` (read only) solves the same problem for its own overlays:
on `Quickshell.screensChanged`, when its target is no longer listed it sets the target to `null`
and, in `Qt.callLater`, picks the focused screen; `visible` requires a target; the fallback is
`screens[0]`.

## Goals / Non-Goals

**Goals:**
- The behavior in `specs/alert-display/spec.md`, with the choice of monitor in `Logic.js` and
  unit-tested.

**Non-Goals:**
- Moving the card back to a monitor that returns: the name can change (DP-4 came back as DP-5),
  and a card that jumps between monitors while the user reads it is worse than one that stays.
  Known and accepted: Omarchy moves the workspaces back to the returning monitor, so the user's
  windows may be there while the card stays on the laptop; the card keeps the keyboard, so the
  first key pressed shows where it is. No history of monitors and no polling of the focus: the
  card reacts only to the shell's list of monitors changing.
- Detecting the ghost state from `Service.qml`: it would treat the symptom; with the window
  following its monitor, the state cannot arise.
- An automated live test: it would have to switch the user's monitors off.

## Decisions

1. **`Logic.pickScreen(names, focusedName)` returns an index or -1.** It returns the index of
   `focusedName` when listed, otherwise 0, and -1 for an empty list. It takes names, not screen
   objects, so node can test it. Alternative: copy the shell's inline logic into the QML;
   rejected because the project keeps every decision in `Logic.js`. It has no "current monitor"
   input: a card whose screen is still listed is never moved (decision 2 returns before asking),
   so adding a monitor never moves the card, and a connector name reused by another monitor is
   never taken for the old one. (A `currentName` parameter was dropped after the review: no
   caller passed one.)

2. **Follow `Quickshell.screensChanged` in two steps, like the shell.** A `Connections` on
   `Quickshell` calls one QML function. It acts when the card is open and
   `Quickshell.screens.indexOf(targetScreen) < 0`, which also holds when `targetScreen` is null
   (a monitor returning after all were gone). It sets `targetScreen` to `null` first, then in
   `Qt.callLater` picks again. The null step lets Quickshell finish closing the old window before
   a new one is mapped, which is why the shell does it. The check compares against the screen
   list, not against `null`, since a destroyed screen object may stay truthy in QML.

   The callback re-reads the state, because anything may happen before it runs: it returns at
   once when the card is no longer open (dismissed, closed by the shell, meeting over) or when
   `targetScreen` is set again (a new `open()` chose a screen). Otherwise it calls `pickScreen`
   with the listed names and the focused name (the old screen object is not read: a reused
   connector name is not "still there"), and maps -1 to `null`, never to
   `screens[-1]`. It does not touch the keyboard or the guard (decision 4 does, when the window
   shows); with no screen it leaves the card open and hidden, and the next `screensChanged`
   tries again. Those paths (every monitor gone, a dismiss or a new summon before the callback)
   are covered by this contract, reviewed in the code, and by the unit tests of `pickScreen`
   (an empty list gives -1); not by a manual check that switches every monitor off.

3. **`visible` requires a screen the compositor knows**, like the shell's `targetMonitor`: a
   `targetMonitor` property finds the entry of `Hyprland.monitors` with the name of
   `targetScreen` (read only while Quickshell still lists that screen, since a destroyed screen
   object may stay truthy), and `visible: root.opened && root.targetScreen !== null && root.targetMonitor
   !== null`. A Qt screen that is not yet a Hyprland output would get a layer surface the
   compositor closes at once, with no later `screensChanged` to try again; the binding instead
   maps the window when Hyprland lists the monitor. A card with no monitor is hidden, not handed
   to Quickshell with no screen.

4. **Each time the window becomes visible, take the keyboard and restart the input guard.**
   The window's `onVisibleChanged`, when `visible` turns true, sets `guardKeyMs = Date.now()` at
   once (so no key already queued gets through before the focus moves), and runs a
   `Qt.callLater` that, if the window is still visible, calls `keyCatcher.forceActiveFocus()`;
   `Logic.isGuarded` swallows input for `inputGuardMs` from the moment the card can be seen. `visible` depends on `targetMonitor`, a binding that may turn
   non-null on a later Hyprland signal with no new `screensChanged`, so arming in the screen
   callback could let the guard run out, and the focus land, before the card shows. The same
   handler covers `open()`, where it matches the guard `openedAtMs` already gives, and every
   move: the card reappears under someone who may be typing. `openedAtMs` and `closesAtMs` stay: the closing countdown of a
   notice card reads `closesAtMs`, fixed in `open()`, and a move must not lengthen it.
   Alternative: no guard after a move; rejected, the same accident the guard exists for.

5. **Nothing else changes.** Countdown, phase, selected button and mode live in `Alert.qml`
   properties that a new window does not reset; the sprite is not reset either.

## Risks / Trade-offs

- [Quickshell maps the window on the new screen in a way the code cannot see] → The manual
  check unplugs and replugs a monitor with a `test` card on screen and confirms the card
  reappears, takes Enter and Esc, and stays put on replug.
- [A monitor removed and added within one event] → `followScreens` runs on every change and the
  null step happens only when the current screen is no longer listed, so the worst case is one
  extra remap.
- [`Hyprland.focusedMonitor` lags behind the screen list right after a removal] → `pickScreen`
  falls back to the first listed monitor. With one monitor left that is the laptop screen; with
  more, it is whichever Qt lists first, not necessarily the laptop.

## Migration Plan

None: no config, state or IPC changes. Released as a patch (0.3.3) from `staging` after the
marketplace approves 0.3.2.
