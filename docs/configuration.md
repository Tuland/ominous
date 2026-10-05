# Configuration

`~/.config/omarchy/ominous.json` is optional and re-read on save. Ominous only reads it, never
writes it.

| Key | Default | Meaning |
|---|---|---|
| `calendars` | `[]` | Calendar names or ids (as `omacal calendars` lists them) that alert. Empty = all. |
| `onlyWithLink` | `false` | `true` = alert only for meetings with a join link (an `https://` conference link from OmaCal). A link written only in the location does not count. |
| `leadSeconds` | `60` | How long before the start the card appears (0–3600). |
| `tenseSeconds` | `15` | How long before the start the card turns from relaxed to tense (0–3600). `0` skips the tense phase. |
| `dim` | theme | Opacity of the veil over the rest of the monitor, `0`–`1`. Unset = the theme's menu scrim. |
| `mode` | `"professional"` | `"professional"` or `"playful"`: the mode used until you first flip the switch on the card. |
| `themes` | `{ "professional": "classic", "playful": "marine" }` | Which [theme](themes.md) each mode uses. Either key may be left out. |

```json
{ "calendars": ["work@example.com"], "leadSeconds": 60, "themes": { "playful": "shiba" } }
```

A value that is out of range or of the wrong type falls back to its default; a file that is not
valid JSON gives the defaults, and the shell log says so.

## Choices made while using it

What you choose while using Ominous is kept apart, in `~/.local/state/ominous/`, and wins over
the config:

| File | Written by | Holds |
|---|---|---|
| `state.json` | the card's switch (or `M`) | the mode |
| `themes.json` | `omarchy-shell ominous theme` | the theme per mode |

Delete either file, or run `omarchy-shell ominous theme reset`, to go back to `ominous.json`.
