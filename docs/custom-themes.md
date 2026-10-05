# Making a theme

A theme is a JSON file named `<name>.json`, with `<name>` made of `a-z`, `0-9`, `_` and `-`.
Put it in `~/.config/omarchy/ominous/themes/`; a file there with the name of a shipped theme
replaces that theme. Then pick it and look at it:

```bash
omarchy-shell ominous theme mytheme
omarchy-shell ominous preview "angry playful"
```

Edits are picked up on save. If a theme is missing or is not valid JSON, the mode falls back to
its default theme and `omarchy-shell ominous status` reports the error in `themeError`.

## Format

```json
{
  "progress": false,
  "palette": { "k": "background", "s": "#c88a5a", ".": "transparent" },
  "phases": {
    "relaxed": { "color": "accent", "caption": "All quiet.", "frames": [["....", ".ss."]] },
    "tense":   { "color": "accent", "frameMs": 900, "frames": [["....", ".ss."], ["....", "ss.."]] },
    "angry":   { "color": "urgent", "caption": "Late!", "frameMs": 250, "shake": true, "frames": [["....", ".ss."]] }
  }
}
```

| Key | Meaning |
|---|---|
| `progress` | `true` draws a thin progress bar along the card's bottom edge. |
| `palette` | Sprite only. One character per color; characters not listed are transparent. |
| `phases.<relaxed\|tense\|angry>.color` | Signal color of the countdown, the selected button and the bar. Unset: accent, a blend of accent and urgent, urgent. |
| `phases.*.caption` | One line of plain text under the countdown (80 characters at most). |
| `phases.*.frames` | Sprite frames: lists of equal-length text rows, each cell one palette character. At most 32x32, and every frame of every phase has the same size. |
| `phases.*.frameMs` | Time per frame, 80–5000 ms (default 500). |
| `phases.angry.shake` | `true` shakes the sprite once when the meeting starts. |

Colors are palette roles (`accent`, `urgent`, `foreground`, `muted`, `background`,
`transparent`), which follow the current Omarchy theme, or hex (`#rgb`, `#rrggbb`, `#rrggbbaa`).
A sprite that is malformed is ignored; the colors and captions of the theme still apply.

## Tips

- 16x16 cells read well; the card draws each cell as a whole-pixel square, so the art stays
  crisp at any scale.
- Use roles for outlines and accents, so the character fits light and dark Omarchy themes alike.
- Keep relaxed to one still frame and let the animation grow toward angry, as the shipped themes
  do.
- `reset` is a command word, so a theme named `reset` can only be chosen in `ominous.json`.
