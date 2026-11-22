# Design

## Context

See proposal.md for why. The pieces this change works with:

- `Service.qml` runs `omacal agenda --days 2 --json` once a minute through a `Process` with a
  `StdioCollector` (`waitForEnd: true`), parses the text, stores `parsed.data` in `events` and
  calls `tick()`. `tick()` uses `Logic.claimDue` and `fired` (keyed by `Logic.eventKey`, the event
  id plus its start) and summons the overlay with `payloadFor(ev)` =
  `withLook(Logic.eventPayload(ev))`.
- The shell's `summon` always opens the overlay and calls `Alert.open(payload)`, which resets the
  card: fields, selection (`Logic.initialSelection`), input guard, sprite. The plugin API also has
  `hide(id)` (calls `Alert.close()`) and `isPluginOpen(id)`, which reads `Alert.opened`.
  `Alert.dismiss()` clears `opened` before it calls `hide`, and a 250 ms timer dismisses the card
  once the meeting is over (`Logic.isOver`).
- OmaCal's events carry `eventId` (an integer from its local database), `startMs`, `endMs`,
  `recurring`, `response` and the fields the card shows. Whether the instances of a recurring
  event share one `eventId` is not documented; see Risks.
- The tool gaps are in `tests/live.sh` `cleanup()` and `tools/shoot-card.sh` `only_card()`, on top
  of the uncommitted `guard-live-test-tools` diff.

## Goals / Non-Goals

**Goals:**
- The card never shows a link, title or time older than the last refresh without saying so.
- A huge or crafted agenda cannot make the shell hold more than 1 MiB and one byte of OmaCal's
  output per refresh.

**Non-Goals:**
- Following theme, mode or config changes on an open card: those are the user's own, not the
  calendar's.
- Fixing the `live.sh` marginal case (see Decisions).
- A streaming JSON parser; a limit on the number of events (see the agenda decision).
- A QML test harness (see Risks, known limit).

## Decisions

### Every decision about the open card is one pure function

`Logic.followShown(shown, isOpen, events, nowMs)` decides; `Service.qml` only applies the
answer. `shown` is what the service remembers of the card it opened from the agenda:
`{ key, eventId, fields, cfg }`, where `key` is `Logic.eventKey(ev)`, `eventId` is the event's id
when it is a finite number or a non-empty string (else null), `fields` is `Logic.eventPayload(ev)`
(title, start, end, place, calendar, cleaned link), and `cfg` is the config in use when the agenda
card first opened. `cfg` is carried over unchanged by every update, so alertability is always
judged with it: editing `calendars` or `onlyWithLink` while a card is open never reads as
"Removed" (config changes are a non-goal).

`isOpen` is `shell.isPluginOpen(id)` when the shell has that function (Omarchy 4.5 does), else
`null` (unknown). With `isOpen` null, every answer other than `keep` becomes `close`: the
service cannot tell whether the card is still on screen, so it hides it rather than leave old
values or reopen a dismissed card (`hide` on a closed overlay does nothing).

The answers, checked in this order (the first that applies wins):

| # | When | Answer | Service does |
|---|---|---|---|
| 1 | `shown` is null | `keep` | nothing |
| 2 | `isOpen` is false (dismissed, or closed at the end) | `forget` | `shown = null` |
| 3 | an event has `shown.key`, and it is not alertable (with `shown.cfg`) | `declined` when its `response` is `declined`, else `removed` | summon the closing card (below) |
| 4 | an event has `shown.key`, and it is over (`isOver`) | `close` | `hide(id)`; `shown = null` |
| 5 | an event has `shown.key`, and its `eventPayload` differs from `shown.fields` | `changed` | summon the new payload with `notice: {kind: "changed", fields}`; `shown` = the new event, `cfg` kept |
| 6 | an event has `shown.key` | `keep` | nothing |
| 7 | no event has `shown.key`; `shown.eventId` is not null; events with that `eventId`, `recurring === false` and another start exist | the one whose start is nearest the old one decides: `declined` when its `response` is `declined`; `moved` when it is alertable; `removed` otherwise | summon the closing card |
| 8 | anything else | `removed` | summon the closing card |

The closing card is `shown.fields` (the values the user has been reading: old title, old start,
so the phase does not jump) with `url: ""` (Join hidden, Dismiss selected by the existing rule)
and `notice: {kind, closeInSeconds: 15}`, plus `movedToMs` (the new start) for `moved`. After the
summon `shown = null`: a card counting down to close is not followed any more, and the
requirement says so.

Only an event with `recurring === false` (not merely not `true`) can be a moved candidate:
OmaCal does not document whether the instances of a series share one `eventId`, so a cancelled
instance could otherwise be read as "moved" to the next one. An event without a valid id never
matches another event. A moved instance of a series shows "Removed from your calendar". In
every case the meeting at its new start alerts again by the normal path, if that start is still
ahead: it has a new key that has not alerted. `fields` in a `changed` notice lists the changed
card fields among `title`, `end`, `place`, `calendar`, `link`, in that order.

`shown` is set only when a summon returns true. That is all the shell's API lets the service
observe: the shell catches an error thrown inside `Alert.open()` and still returns true, so a
card that failed to render its update is not detected (the overlay's own code has no throwing
path for a normalized payload). After a summon that returns false, the service hides the card
and sets `shown = null`: it never leaves the old meeting on screen. `test` and `preview` set
`shown = null` only when their own summon returns true.

The flow after each successful refresh, before `tick()`:

```
followShown(shown, isOpen, events, now)
  keep    -------------------------------------------------------> tick()
  forget  --> shown = null --------------------------------------> tick()
  close   --> hide(id); shown = null ----------------------------> tick()
  changed --> summon(new payload + notice)
                true  --> shown = new event (cfg kept) ----------> tick()
                false --> hide(id); shown = null ----------------> tick()
  removed / declined / moved --> summon(closing card)
                true  --> shown = null --------------------------> tick()
                false --> hide(id); shown = null ----------------> tick()
```

The round trip is unit tested: after a `changed` update, `shown` rebuilt from the new event (with
the old `cfg`) gives `keep` on the next call, so there is no re-summon loop.

Why compare `eventPayload` and not the raw event: it is what the card shows and opens (cleaned
text, `safeUrl` link), so a change in a field the card ignores (attendees, others' responses)
does not reset the card, and the note names exactly what the user sees change.

Why re-summon and not a new entry point on the overlay: the shell's only way into the overlay is
`summon` -> `open()`, and a full `open()` is what an update needs: the selection is recomputed
for the new link (an unknown host starts on Dismiss, a recognized one on Join, the rule the user
knows), and the input guard restarts so a key already on its way cannot act on values the user
has not read.

Why a moved meeting always counts down and closes: a version that kept the card open when the
new start was still inside the alert window was reviewed three times; that branch alone needed
the alert window in the decision, a claim in `fired` so no second card opened, a phase that
could go back from angry (against `alert-phases`), and precedence rules against `changed`. The
closing card keeps the old values, so the phase never changes, and the meeting alerts again by
the normal path. Cost: a meeting moved by a minute shows "Moved to 10:01", closes, and its card
comes back at its new alert time.

### The overlay shows the notice and runs the countdown

The payload gains an optional `notice`. `Logic.normalizePayload` checks it like every other
field, because any caller of the shell's IPC can summon the overlay: `kind` must be `changed`,
`moved`, `removed` or `declined`; `fields` (for `changed`) is reduced to the known names, without
duplicates, in the fixed order, and a `changed` notice with no field left is null;
`closeInSeconds` must be an integer from 1 to 60, else absent; `movedToMs` (for `moved`) must be
a number a `Date` can hold, else the notice is null. Anything else makes `notice` null. The
overlay never shows text taken from the notice: `Logic.noticeText(notice, nowMs, closesAtMs)`
builds the line from a fixed vocabulary and `movedToMs`, formatted `HH:mm` (with the weekday
when it is not today) by a pure helper in `Logic.js`, so node can test it.

`Alert.open()` sets `closesAtMs = openedAtMs + closeInSeconds * 1000` when the notice has one,
else 0. The 250 ms timer that dismisses the card at the meeting's end also dismisses it when
`closesAtMs` is reached (`Logic.shouldClose(endMs, closesAtMs, nowMs)`). When the meeting ends
before the countdown does, the card closes at the end, as every card does today: the countdown
never keeps a card open past its meeting. The line is one plain-text `Text` under the countdown,
in the phase color, one line, elided; it takes no space when there is no notice.

`tools/shoot-card.sh` takes an optional notice (a kind, such as `removed`) after its existing
arguments; without it the capture is the same as today, so `tools/make-preview.sh` is unchanged.

### The agenda read is capped in the pipe

The `Process` command becomes
`["bash", "-c", "set -o pipefail; omacal agenda --days 2 --json | head -c 1048577"]`. The accepted
limit is 1 MiB (1048576 bytes); `head` reads one byte more as a sentinel, so the collector holds
at most 1048577 bytes, and OmaCal gets `SIGPIPE` when it writes past that.

In `onExited`, `Logic.readAgenda(previous, text, exitCode)` returns `{ events, error }`, where
`events` is the previous list whenever there is an error; the QML assigns `events`, sets
`lastError` to the error (empty on success, so a good refresh clears an old error) and logs a
non-empty one. The size is checked before the exit code, since a cut output makes OmaCal (and,
with `pipefail`, the pipeline) exit with 141: the function counts the UTF-8 bytes of the text and
refuses them over 1048576. A UTF-8 sequence cut by `head` decodes to U+FFFD, three bytes, never
fewer than the one to three bytes it replaces, so a cut output is always counted over the limit.

Alternatives considered: checking `agendaOut.text.length` (UTF-16 units undercount bytes, so a cut
output with non-ASCII text could pass as complete and then fail to parse with a misleading
error); a `SplitParser` counting chunks (more QML, same result); asking OmaCal for a limit (it has
no such option).

No limit on the number of events. Within 1 MiB the parsed agenda holds at most a few thousand
entries, and the work per tick is linear in them (`nextDue`, `claimDue`, `statusSnapshot` and
`followShown` each walk the list once). A cap would have to be applied before alertability is
known per config, and cutting there could push out a meeting the user accepted, which the "one
card per group" rule promises its own card. Considered and dropped after review.

Why keep the old events on an oversize output: same as for unreadable output today; dropping them
would silence every alert, which is what a flood would want.

### `tests/live.sh`: document the limit, check `rm`, rename over targets

The checks write the same three files the user can write (`state.json` from the card's `M`,
`themes.json` from `theme`, `marine.json` from an editor), so at the end the script cannot tell
whose file it is. Keeping a file that had no backup would leave, in the common case, a check's
`{"progress":true}` `marine.json` that hides the shipped `marine` theme; removing it loses only a
file the user created during a test run, which `docs/development.md` already says not to use the
session for. So the comment on `cleanup()` states the limit and the reason, and a failed `rm -f`
counts as a file not put back (keeps `$BK`, prints the path).

The restore copies each backup to a temporary file beside the target and renames it over the
target with `mv -Tf` (`-T`: the target is never treated as a directory), so a symlink put at the
target's path during the run, to a file or to a directory, is replaced, not written through.

### `tools/shoot-card.sh`: the card keeps clear of the edges

`only_card` also requires the trimmed box to leave at least 8 px on every side
(`bx >= 8`, `by >= 8`, `bx + bw <= w - 8`, `by + bh <= h - 8`). The card is at most
`panel.width - Style.gapsOut * 8` wide and shorter than the monitor, so a real card always passes;
a veil that is not opaque (desktop showing) trims to the whole screen and fails.

## Risks / Trade-offs

- **Known limit: the glue in `Service.qml` is not exercised by an automated test.** Raised by
  the round-3 and round-4 reviews and kept on purpose. Every decision (which answer, which
  notice, the agenda read and its error, the notice text and its checks, when the card closes)
  is a pure function in `Logic.js` with unit tests. What applies the answers in `Service.qml` is
  checked by code review only, since a live check would need a fake calendar behind the running
  shell: the summon and hide calls, `shown` and its clearing (also after a failed summon of
  `test`, `preview` or an update), the copy of `cfg` across updates, and the assignment of
  `events` and `lastError` with the log line after an agenda read (oversize, then a valid read
  that clears the error). The overlay side is checked live: a summon with a crafted payload
  shows the notice and closes at the end of its countdown, or at once on Esc (`tests/live.sh`),
  and `tools/shoot-card.sh` captures a card with a notice to look at. The project has no QML
  test harness, and the rule in `CLAUDE.md` keeps decisions out of QML for this reason; a
  harness (an offscreen shell with a fake `omacal`) is a separate change if the glue grows.
- [Recurring events may share one `eventId`] -> Not relied on: only `recurring === false`
  events are read as moved (see the first decision). Cost: a moved occurrence, or an event
  without the field, shows "Removed" instead of "Moved", then alerts at its new time.
- [A moved meeting whose new start is already in its alert window, or any meeting falling due
  during a countdown] -> Found by the review of the diff since 0.3.1: `tick()` ran right after
  `follow()` and replaced the closing card at once, so its note was never read. Decided (and
  confirmed by a separate judge): while a card with a countdown is open, `tick()` returns before
  `claimDue` until the countdown ends or the card is gone (`Logic.holdsAlerts`); `summon()`
  notes the end of the countdown of every payload the shell accepts (`Logic.closingUntil`), so
  any other card clears it and a failed summon never sets it. Nothing is marked as alerted
  meanwhile, so the waiting alert opens right after, on the newest agenda. Rejected: no alert
  at all while any card is open (an alert would wait behind a `test` or `preview` card).
  Limits kept: the alert can come up to 20 s late (15 s plus the 5 s tick); a meeting whose
  alert window has less than that left when it falls due (it entered its window only
  `GRACE_SECONDS` before ending, e.g. moved to a start almost two minutes ago) can pass without
  a card. A shell that cannot say whether the card is open waits for the end of the countdown.
- [`Shown.single` is read when the card opens and not refreshed while nothing on the card
  changes] -> A meeting that becomes a single event while its card is open, then moves, shows
  "Removed" instead of "Moved", then alerts at its new time. Kept: refreshing it would need a
  silent update path for one flag; the error only ever falls on the "Removed" side, and the
  candidate itself must be `recurring: false` either way.
- [A closing card keeps the meeting's old end] -> A meeting moved in the last 15 s before its
  old end closes its card then, before the note is read. Kept: rare, and no on-card sign for it
  would be clear.
- [`tests/live.sh` writes through a symlink created during the run] -> The checks write the user
  files with plain redirections, so a symlink put at one of them after the backup (by the user
  or another process, during a developer's test run) is followed by the checks' writes; the
  restore then replaces the link, but its target keeps what the checks wrote. Documented in the
  `cleanup()` comment with the other limits; the backup refuses a symlink present at the start.
- [An agenda just over 1 MiB, from a busy shared calendar, stops every refresh] -> The meetings
  already read keep alerting and `status` names the error; 1 MiB is about three thousand times
  a typical two-day agenda.
- [Re-summoning while the user reads the card] -> The card resets its selection and guard; this
  happens only when the calendar changed what the card shows, and the note says what.
- [`bash` or `head` missing] -> Both are part of the base system Omarchy itself runs on (its
  scripts are `bash`, `head` is coreutils). A missing `bash` leaves the `Process` unable to
  start, exactly as a missing `omacal` does today; a missing `head` makes the pipeline exit 127,
  reported as "omacal exited with 127". No further fallback: the shell itself would not run.
- [The limit in `live.sh` stays] -> Documented in the code where a reviewer reads it.
