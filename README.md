# Ominous

*The ominous meeting.* An [Omarchy](https://omarchy.org) shell plugin that puts a big card in
the middle of the focused monitor shortly before a meeting starts, over a dimmed screen. It
stays until you dismiss it or the meeting ends — a corner toast is exactly what gets missed.

Calendar data comes from [OmaCal](https://omacal.app): the plugin reads `omacal agenda --json`
(OmaCal's offline database) once a minute. No Google login, no token of its own.

## Install

```bash
git clone https://github.com/Tuland/ominous.git ~/.config/omarchy/plugins/tuland.ominous
omarchy-shell shell rescanPlugins
omarchy plugin enable tuland.ominous
```

For development, keep the checkout elsewhere and symlink it into
`~/.config/omarchy/plugins/tuland.ominous`. After editing QML, run `omarchy restart shell`:
an overlay already summoned once keeps its old code through `rescanPlugins`.

## Configuration — `~/.config/omarchy/ominous.json`

Optional; re-read on save.

| Key | Default | Meaning |
|---|---|---|
| `calendars` | `[]` | Calendar names or ids (as `omacal calendars` lists them) that alert. Empty = all. |
| `leadSeconds` | `60` | How long before the start the card appears (0–3600). |
| `dim` | theme | Opacity of the veil over the rest of the monitor, `0`–`1`. Unset = the theme's menu scrim. |

```json
{ "calendars": ["work@example.com"], "leadSeconds": 60 }
```

All-day events and declined invitations never alert. A meeting that started less than two
minutes ago still does (suspend, shell restart, late sync).

## Using it

- Two buttons, **Join on …** (selected) and **Dismiss**: `←`/`→` or `Tab` move between them,
  `Enter`/`Space` or a click activates. Only `https://` links are opened.
- `Esc` or a click outside the card: dismiss.
- Input in the first second is ignored, so a keystroke already on its way cannot join or dismiss
  an alert you have not read.

```bash
omarchy-shell ominous test     # show a synthetic alert now
omarchy-shell ominous status   # JSON: config, counts, next start, last error (no titles)
node tests/logic.test.mjs      # checks for Logic.js
```

## Limits

- Nothing can draw over a locked screen: an alert fired while locked is waiting when you unlock,
  as long as the meeting has not ended.
- A suspended laptop is not woken.

## Credits

The overlay approach and the first-second input guard were inspired by
[OMeetingBar](https://github.com/disy-mk/OMeetingBar) (MIT). No code was copied.

## License

MIT — see [`LICENSE`](LICENSE).
