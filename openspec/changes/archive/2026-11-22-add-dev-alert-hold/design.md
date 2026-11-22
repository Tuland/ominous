# Design

## Context

See proposal.md for the motivation. After `fix-0-3-1-manual-review`, `Service.tick()` returns
before `Logic.claimDue` while a closing card counts down (`Logic.holdsAlerts(until, isOpen,
now)`, with `closingUntilMs` noted by `summon()`), and `follow()` applies `Logic.followShown` to
`shown`, the agenda card the service opened. `test` and `preview` clear `shown`. IPC functions
take and return strings. Every decision lives in `Logic.js` with a unit test; the QML is glue.

## Goals / Non-Goals

**Goals:**

- One gate for every reason new alerts wait, so the closing-card wait and the hold cannot drift.
- A hold nothing has to release: time, a shell restart, or `hold 0` end it.
- The tools never hide a real alert and never let one into a capture.

**Non-Goals:**

- Holding `test` or `preview` cards, or the agenda refresh itself (events keep updating, so
  what follows the hold uses the newest agenda).
- A hold that survives a restart, or one longer than 60 seconds.
- A sign on the card that alerts are held: it would end up in `preview.png`. The tools say it
  on stderr, `status` says it always.

## Decisions

### The command is parsed in `Logic.js`

`Logic.holdCommand(arg, nowMs)` returns `{ untilMs, message }` or `{ error }`: the argument,
trimmed, must be digits only and from 0 to `HOLD_MAX_SECONDS` (60); 0 gives `untilMs` 0 and
"hold ended", any other value `nowMs + s * 1000` and "ok". `Service.qml` has `property real
holdUntilMs: 0` and an IPC function `hold(spec: string): string`. Alternative: an `int` IPC
parameter; refused, since the other commands take strings and the shell's conversion of a bad
value is not ours to check.

### One gate for alerts, shared with the closing card

`tick()` returns when `Logic.holdsAlerts(closingUntilMs, overlayOpen(), now)` or
`Logic.holdsAlerts(holdUntilMs, null, now)` is true. `isOpen` null already means "only the time
counts", which is what a hold needs: closing a card does not end it. `holdsAlerts` gains one
rule: a wait more than `HOLD_MAX_SECONDS` away counts as over. Every real wait is at most 60 s
(a hold, or a countdown of at most 60 s, `normalizeNotice`), so this only matters when the wall
clock steps back: without it, a hold or a countdown would last as long as the step (an hour
for a step of an hour), and alerts with it. The review asked to keep the rule out of the
closing-card wait, since after a step back a new alert can cover a note still counting down;
kept for both, because a covered note is a smaller harm than alerts stopped for the length of
the step.

### The agenda card is frozen during a hold, then checked once

`Logic.followShown` takes one more argument, `held`: while held it answers `forget` when the
card was closed and `keep` otherwise. When the hold ends (`hold 0`, or the first `tick()` after
the time is up, before `claimDue`), `follow()` runs once more on the newest agenda; nothing from
the hold is replayed, so a card closed meanwhile is forgotten, not reopened. A review of the
first version of this plan (a remembered `followPending` and a separate `followDuringHold`)
found that simpler. Alternatives: clearing
`shown` for good (the first plan) leaves an open real card with a stale Join link, the defect
`fix-0-3-1-manual-review` closed; skipping `follow()` entirely would miss a card the tool closed.
The tools end their run by hiding their card first and ending the hold second, so the check at
the end sees the overlay closed and forgets, and never takes the synthetic card for the agenda
card.

### `status` prints the seconds left

`Logic.holdLeft(untilMs, nowMs)`: whole seconds, rounded up, 0 when over (the same bound as
`holdsAlerts`, so `status` never shows a hold the gate ignores).

### One owner per tool run

`tools/shoot-card.sh` owns the hold unless `OMINOUS_HOLD_OWNER` is set by its caller. The owner
runs `hold 60` first, prints "real alerts held" on stderr, and on exit runs `hold 0` and prints
"real alerts released". Every run of `shoot-card.sh`, owner or not, hides its card on exit, but
arms that hide only once the screen was found clear (next decision), so it never hides a card
it did not open. `shoot-card.sh` renews with `hold 60` before each
try either way, so a long run never has a gap. `tools/make-preview.sh` and
`tests/theme-check.sh` set `OMINOUS_HOLD_OWNER=1` and own the hold for their run: they first
stop when a card is on screen (as `shoot-card.sh` does), then hold; ending the hold goes inside
their existing cleanup (`restore()` in `theme-check.sh`, before its manifest check), never in a
second `trap ... EXIT`, which would replace the first. `theme-check.sh` loses its unconditional
`hide` before the first shot. Any `hold`
answer other than `ok` stops the script: "the running plugin cannot hold alerts: restart the
shell". Alternative (the first plan): each `shoot-card.sh` call holds and releases; refused,
because the gap between two calls lets a real alert open and be marked, and the next call would
hide it.

### `shoot-card.sh` refuses instead of hiding

With the hold in place, a card on screen when `shoot-card.sh` starts is a real alert (opened
before the hold), a `test`/`preview` card, or a card left by a crashed run. Hiding it, as
`fix-0-3-1-manual-review` made the script do, loses a real alert that was already marked. The
script now stops with "a card is on screen: close it and run again" (after waiting up to 5 s
for a card the previous call is still closing), without hiding anything; the hide on exit is
armed only after that check. Inside an owned run, the previous call has
hidden its own card, so this never stops a run that is going well.

### The agent rule

`CLAUDE.md`, "Checking a change": before an agent holds alerts, with `hold` or through
`shoot-card.sh`, `make-preview.sh` or `theme-check.sh`, it says so; afterwards it checks
`status` for `holdSeconds` 0. The service's time limit is the guarantee; the rule makes the hold
visible to the user.

### Details settled by the code review

Each script holds first and looks at the screen second, so no real alert can open between the
check and the hold; `shoot-card.sh` arms its hide only after that check, and hides nothing
before its first summon. A Hyprland that cannot list its layers counts as "a card is on
screen". `theme-check.sh` renews the hold before each theme change, stops when a shot leaves a
card it did not open, and its `restore()` no longer hides the overlay (`shoot-card.sh` hides
its own cards). The live check of a restart sets a hold, restarts, and asserts it is gone
right away; it reports SKIP when the plugin before the restart had no `hold`.

## Risks / Trade-offs

- [An alert comes late or not at all] -> While held, nothing is marked. After the hold, an alert
  still in its window opens within 5 s; one whose window closed during the hold (a meeting that
  fell due near the end of its `GRACE_SECONDS`, or a chain of holds covering a whole window)
  gets no card. The tools keep holds short and end them on exit.
- [A real agenda card shows a stale link during a hold] -> At most for the hold's length; checked
  once at the end. The tools refuse to start with a card on screen, so this only happens with a
  manual `hold`.
- [The shell runs an older plugin without `hold`] -> The scripts stop before any summon.
- [A developer forgets a hold] -> It ends by itself within 60 s.
- [Clock steps] -> Forward: the hold ends early (harmless). Back: bounded by the 60 s rule.
