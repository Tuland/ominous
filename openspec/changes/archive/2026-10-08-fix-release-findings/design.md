# Design

## Context

Findings of the 0.3.0 release review (code, `git diff v0.2.0..HEAD`) and of the whole-code
security audit, both run by reviewer agents in contexts separate from the author, each verified
before it was accepted (node probes on `Logic.js`, the launcher script, the code). `claimDue`
marks one event per 5-second tick; `omarchy-launch-browser` ends with
`uwsm-app -- "$browser_exec" "${@/--private/$private_flag}"`, a bash substitution applied to every
argument.

## Goals / Non-Goals

**Goals:**
- Close every finding of both reports before 0.3.0, each with a test, a spec scenario or a doc
  line.

**Non-Goals:**
- Stopping invitations spread a minute or more apart: they give one card each, as any calendar
  reminder would, and the docs say so.
- Changing `omarchy-launch-browser`: the user chose not to report it upstream; Ominous refuses
  what the launcher would rewrite.

## Decisions

- **Group by start, in `claimDue`, and only unconfirmed events.** When it claims an event that
  starts at S it also marks every alertable event the user has not confirmed (not accepted, not
  organized) that starts in [S, S + 60 s). Grouping by start, not by the open window, bounds a
  flood at one card a minute however its starts are spread (a window-based group was beaten by
  starts 5 s apart, found by the change's review), and keeps a late meeting from swallowing the
  next one. Confirmed events are never marked by another's card, and win a tie at the same
  start, since only they are sure to be the user's own: OmaCal reports `response` and
  `organizer`, and real meetings are often still `needsAction`, so confirmation alone cannot be
  the filter for alerting. Alternative turned down: a minimum pause between a dismiss and the
  next summon, which would delay a real alert too. "One card per group" chosen by the user, the
  grouping rule confirmed after the review.
- **A usable start** in `isAlertable`: `isFinite` and below `8.64e15`, the largest time a `Date`
  holds, so `statusSnapshot`'s `toISOString` cannot throw.
- **`--private` refused anywhere in the link**, case-sensitive like the bash substitution.
  Stricter than needed (only the host matters for what is shown), but a path rewritten silently
  is also a link that differs from the one shown, and real meeting links do not contain it.
- **Nested `themes` keys** reported as `themes.` plus the name: a plain word as it is
  (`themes.Playful`), anything else quoted and escaped (`themes."a\nb"`), so every reported name
  is one printable ASCII line.
- **Guard at the moment of input**: `Keys.onPressed` and the clicks call
  `Logic.isGuarded(..., Date.now(), ...)` instead of reading the `guarded` property, which
  follows the 250 ms tick. The property still drives the look (the sprite's animation).
- **Unreadable file**: `onLoadFailed: function(error)` like `ThemeFile.qml`;
  `FileViewError.FileNotFound` gives the defaults silently, anything else sets
  `configError: "config cannot be read, using defaults"`.
- **Captions** through `cleanText(caption, 80)`, and `clip: true` on the caption `Text`.
- **At most 64 frames per phase** (`MAX_FRAMES`); the shipped themes use 3.
- **Payload ranges** reuse the config's: `dim` 0..1 or null, seconds 0..3600.
- **Schema**: `leadSeconds` and `tenseSeconds` become `number` (Ominous rounds them);
  `calendars` items `string` or `number`.

## Risks / Trade-offs

- An unanswered real meeting that starts within a minute after an unanswered invitation (or
  another unanswered meeting) shares that card: the user sees a card at that time, not this
  meeting's. Accepting the meeting gives it its own card.
- A link that really contains `--private` cannot be joined from the card; the user opens it from
  the calendar.
