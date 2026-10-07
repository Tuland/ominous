# Using Ominous

## What the card does

The card appears `leadSeconds` before a meeting (one minute by default), in the middle of the
focused monitor over a dimmed screen, and goes through three phases, each with its own color:

- **relaxed** when it appears;
- **tense** in the last `tenseSeconds` before the start (15 by default);
- **angry** once the meeting has started: red, and it stays until you dismiss it or the meeting
  ends.

Which meetings alert:

- Only calendars listed in `calendars` (all of them when the list is empty); see
  [configuration](configuration.md).
- All-day events and declined invitations never alert.
- With `onlyWithLink`, only meetings with an `https://` join link alert.
- A meeting that started less than two minutes ago still alerts, to cover a suspend, a shell
  restart or a late sync.

## On the card

- Two buttons, **Join on …** (selected for a recognized link) and **Dismiss**: `←`/`→` or `Tab` move between them,
  `Enter`/`Space` or a click activates. Only `https://` links are opened.
- Join is selected only for a link to a [recognized host](configuration.md#join-hosts). For any other
  link **Dismiss** is selected, the button shows the real host ("Join on evil.example") and a
  "?" explains that the link is not recognized: the tooltip shows when you move to Join, on
  hover and on a click of the "?". Add the host to `joinHosts` to make Join the default for it.
- `Esc` or a click outside the card: dismiss.
- `M`, or the small switch at the top right: flip between the **professional** and the
  **playful** mode. The choice is remembered for the next alerts; see [themes](themes.md).
- Input in the first second is ignored, so a keystroke already on its way cannot join or dismiss
  an alert you have not read. A key pressed in that second starts it again: while you keep
  typing, the card waits, and it takes keys once you pause for a second.

## Commands

```bash
omarchy-shell ominous test                     # a synthetic meeting one minute away: all three phases in a minute
omarchy-shell ominous preview "tense playful"  # land in one phase and stay there
omarchy-shell shell hide io.github.tuland.ominous        # close the card from a terminal
omarchy-shell ominous status                   # JSON: config, mode, themes, counts, next start, errors
omarchy-shell ominous config                   # your complete config with comments, defaults filled in; writes nothing; see configuration.md
omarchy-shell ominous themes                   # the themes and which mode uses each; see themes.md
omarchy-shell ominous theme shiba              # choose a theme; see themes.md
```

`preview` takes `<relaxed|tense|angry> [professional|playful] [title...]`. Without a mode it uses
the current one and saves nothing; a long title is a quick way to check that text fits.

`status` never prints meeting titles.

## Limits

- Nothing can draw over a locked screen: an alert fired while locked is waiting when you unlock,
  as long as the meeting has not ended.
- A suspended laptop is not woken.
