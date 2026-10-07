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
valid JSON (comments and trailing commas allowed, see below) gives the defaults, and the shell log
says so.

## Comments

`ominous.json` may hold `//` comments, a comma after the last item and a leading byte order mark
(some editors save one). A `//` inside a string, as in a link, is part of the string. Use a
comment to keep an option at hand without it taking effect:

```jsonc
{
  "leadSeconds": 120,    // two minutes
  // "onlyWithLink": true,
}
```

## Every key at a glance

[`ominous.example.jsonc`](ominous.example.jsonc) lists every key with its default and a one-line
comment: copy it to `~/.config/omarchy/ominous.json` to start from it.

After an update adds a key, your file does not show it, and the key keeps its default. To see
yours with every key, in the same format:

```bash
omarchy-shell ominous config > ~/.config/omarchy/ominous.json.new   # prints; writes nothing else
diff ~/.config/omarchy/ominous.json ~/.config/omarchy/ominous.json.new
mv ~/.config/omarchy/ominous.json.new ~/.config/omarchy/ominous.json  # only if you want it
```

The output has your values, the defaults for the rest and Ominous's comments, not yours: compare
before you replace your file. Ominous never writes `ominous.json` itself.

## Unknown keys and errors

A key Ominous does not use is ignored, never an error. `omarchy-shell ominous status` lists such
keys in `unknownKeys` and the shell log names them, so a misspelling (`"leadsecond"`) shows up
instead of silently doing nothing. A file that cannot be read gives the defaults, and
`configError` in `status` says so. Nothing of this appears on the card.

## Editor help

[`ominous.schema.json`](ominous.schema.json) is a JSON Schema of the file. The example file starts
with a `"$schema"` key that points to it, and Ominous ignores that key. Editors with JSON Schema
support (VS Code, Zed, Neovim with a JSON language server) then complete the key names, show what
each one does and underline a value of the wrong type or out of range. The schema is read from
GitHub, from the `main` branch; keys are only ever added, so it also fits an older install.

If your editor underlines the `//` comments, tell it that the file is JSON with comments:

```jsonc
// VS Code, settings.json
"files.associations": { "ominous.json": "jsonc" }
```

```lua
-- Neovim
vim.filetype.add({ filename = { ["ominous.json"] = "jsonc" } })
```

## Choices made while using it

What you choose while using Ominous is kept apart, in `~/.local/state/ominous/`, and wins over
the config:

| File | Written by | Holds |
|---|---|---|
| `state.json` | the card's switch (or `M`) | the mode |
| `themes.json` | `omarchy-shell ominous theme` | the theme per mode |

Delete either file, or run `omarchy-shell ominous theme reset`, to go back to `ominous.json`.
