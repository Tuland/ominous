# Configuration

`~/.config/omarchy/ominous.json` is optional and re-read on save. Ominous only reads it, never
writes it.

| Key | Default | Meaning |
|---|---|---|
| `calendars` | `[]` | Calendar names or ids (as `omacal calendars` lists them) that alert. Empty = all. |
| `onlyWithLink` | `false` | `true` = alert only for meetings with a join link (an `https://` conference link from OmaCal). A link written only in the location does not count. |
| `joinHosts` | 17 meeting hosts, see below | The meeting hosts where Join is selected first (subdomains included). Your list **replaces** the default. |
| `leadSeconds` | `60` | How long before the start the card appears (0–3600). |
| `tenseSeconds` | `15` | How long before the start the card turns from relaxed to tense (0–3600). `0` skips the tense phase. |
| `dim` | theme | Opacity of the veil over the rest of the monitor, `0`–`1`. Unset = the theme's menu scrim. |
| `mode` | `"professional"` | `"professional"` or `"playful"`: the mode used until you first flip the switch on the card. |
| `themes` | `{ "professional": "classic", "playful": "marine" }` | Which [theme](themes.md) each mode uses. Either key may be left out. |

```json
{ "calendars": ["work@example.com"], "leadSeconds": 60, "themes": { "playful": "shiba" } }
```

A value that is out of range or of the wrong type falls back to its default, and `omarchy-shell
ominous status` lists it in `ignoredValues` (see below); a file that is not valid JSON (comments
and trailing commas allowed, see below) gives the defaults, and the shell log says so. A file
that holds only comments is the same as an empty one.

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

## Join hosts

A link comes from the calendar, and on a shared calendar its owner chooses it, so Ominous only
makes **Join** the default for a host it *recognizes*. The default list holds Google Meet
(`meet.google.com`), Zoom (`zoom.us`, `zoom.com`, `zoomgov.com`), Microsoft Teams
(`teams.microsoft.com`, `teams.live.com`, `teams.microsoft.us`, `teams.cloud.microsoft`), Webex
(`webex.com`), Jitsi (`meet.jit.si`), Whereby (`whereby.com`), GoTo (`gotomeeting.com`,
`meet.goto.com`), RingCentral (`v.ringcentral.com`), 8x8 (`8x8.vc`), Proton Meet (`meet.proton.me`)
and FaceTime (`facetime.apple.com`). Each entry is the narrowest host that covers the service's
meeting links: `ringcentral.com` would also cover its community and support sites, so the default
is `v.ringcentral.com`, and `meetings.ringcentral.com` (its older product) is one of the optional
hosts below.

**What recognized means, and does not.** A recognized host means the link opens that meeting
service. It does not mean the meeting, or whoever sent the link, is genuine. Services let customers
create subdomains (`acme.zoom.us`) and let users publish pages on their domains, and Ominous
cannot tell which of those a link points to: in 2020 researchers showed that a flaw in Zoom's
customer subdomains could have been used for phishing, until Zoom fixed it. To be stricter, list only the hosts you really use, such as
your company's `acme.zoom.us`, and nothing else.

- A host covers its **subdomains at any depth**, in any case: `zoom.us` covers
  `us02web.zoom.us`. Names that only look alike (`zoom.us.evil.example`, `evilzoom.us`) are not
  covered. Add the narrowest host that is yours, such as `meet.google.com`, not `google.com`.
- The list you write is the whole list. To keep the default and add one, copy the default
  (`omarchy-shell ominous config` prints it) and add yours. `[]` recognizes nothing.
- `omarchy-shell ominous config` and [`ominous.example.jsonc`](ominous.example.jsonc) also list
  other meeting hosts, commented out: remove the `//` in front of one to recognize it too.

For any other host, the card opens with **Dismiss** selected, so `Enter` opens nothing. The
button reads "Join on" and the host the browser would open (shortened with "…" when long), and a
"?" next to it explains why. Choose Join to open the link anyway. Only the host counts: a link
such as `https://meet.google.com@evil.example/` has the host `evil.example`. A character outside
plain ASCII in a host is shown as its escape (`\u202e`, `\u0435`), so a host cannot hide or
imitate another one.

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
instead of silently doing nothing. A value Ominous refuses, such as `"leadSeconds": 9999` or
`"joinHosts": ["https://zoom.us/"]` (a host name, not a link), is listed in `ignoredValues`, in
the log and in a comment at the top of `omarchy-shell ominous config`, and the key keeps its
default; a value it only tidies (`90.4` read as `90`, `Work@Example.com` in lower case) is not
reported. A file that cannot be read gives the defaults, and `configError` in `status` says so.
Nothing of this appears on the card.

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
