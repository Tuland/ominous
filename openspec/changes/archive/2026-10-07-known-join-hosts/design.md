# Design

## Context

See `proposal.md` for the motivation. Today `Logic.provider(url)` takes the host with
`/^https:\/\/([^\/:?#]+)/` (user information included), matches it against a fixed list of seven
services and returns a label or "browser"; `Alert.qml` shows "Join on " + that label.
`Logic.initialSelection(url)` selects Join whenever there is a link; `nextSelection` and
`activation` only know whether a link exists. The card's buttons are `ActionButton`s sized to
their label. The alert payload is built by `Logic.eventPayload` plus `Logic.look` in the
service and re-checked by `Logic.normalizePayload` in the overlay, which anyone who can call the
shell's IPC can reach. Config keys are declared once in `Logic.CONFIG_FIELDS` (from
`commented-config`): default, description and schema, from which the defaults, the printed
config, the example file and the JSON Schema are derived. `qs.Ui` provides `PanelToolTip`, a
styled Qt Quick `ToolTip` whose visibility is a plain binding and whose text is plain text.

## Goals / Non-Goals

**Goals:**
- Enter never opens an unrecognized link by default; a recognized one behaves as today.
- The user sees the real host before opening an unrecognized link, and learns how to trust it.
- One list, edited only by the user, with a useful default and optional hosts at hand.

**Non-Goals:**
- Custom display names for hosts ("Acme Meet"): an unrecognized-but-trusted host shows the host.
- Converting non-ASCII hosts to punycode: QML's JavaScript has no IDN support; the tooltip warns
  instead, and such a host is never in the list (entries are ASCII).
- Checking the path of a link, or blocking links: the user can always choose Join.
- A new keyboard stop for the "?": the selection still cycles Join and Dismiss only.

## Decisions

### One host parser, used for checking and showing

`Logic.linkHost(url)` takes the authority of a safe URL (after `https://`, before `/`, `?`, `#`),
drops everything up to the last `@`, drops a `:port`, a trailing dot, and lower-cases it. The
same value is matched and shown, so what the user reads is what the browser opens. It replaces
the regex inside `provider`.

### `joinTarget` decides; the QML only shows

`Logic.joinTarget(url, hosts)` returns `{ host, trusted, label }`: `trusted` when the host equals
a listed host or ends with "." + a listed host; `label` is the service name when trusted and the
host is under a known service (`SERVICE_NAMES`, a table from host suffix to "Meet", "Zoom",
"Teams"...), else the shortened host. `provider` goes away. `initialSelection(url, trusted)`
selects Join only for a trusted link; `nextSelection` and `activation` are unchanged, so Join is
still reachable and still opens the link.

- *Alternative: a separate "unknown link" state machine.* Rejected: two inputs to the first
  selection are enough, and the existing tests for the keys keep their meaning.

### `joinHosts` is a declared field with optional values

`CONFIG_FIELDS` gains `joinHosts`: default the 17 hosts, schema
`{ type: "array", items: { type: "string", pattern: <host> } }`, and a new optional property
`optional`, the commented-out hosts (Lark, Feishu, VooV, Zoho, Lifesize, Livestorm, Demio,
StreamYard, Riverside, Tuple, Pumble, Gong, Chorus, Doxy.me). `formatConfig` prints a field that
has `optional` as a multi-line list: one active value per line, then each optional value not
already active as `// "host",`. The output still reads back to the same config (comments and
trailing commas are allowed). The schema gets the `optional` values as `examples`.

`normalizeConfig` reads `joinHosts` only when it is a list: each entry trimmed, lower-cased,
a trailing dot dropped, kept when it matches `^[a-z0-9-]+(\.[a-z0-9-]+)+$` (at least one dot),
duplicates removed. A list with no valid entry is an empty list, by the user's choice.

### The hosts travel in the payload

`look()` adds `joinHosts: cfg.joinHosts`; `normalizePayload` re-validates them with the same
function as the config and falls back to the default when missing or not a list, so a payload
summoned by hand behaves like a real alert. The overlay computes `joinTarget` from the payload.

### The "?" is a small component; the tooltip is the shell's

`components/LinkNotice.qml`: a "?" in the card's muted color with a `MouseArea` (hover, click
toggles a `pinned` flag) and a `PanelToolTip` whose `visible` is
`showWhile || hovered || pinned`. In: `showWhile` (Join selected), `text`. It sits right of
the Join button, only when the link is not trusted. `PanelToolTip`'s 400 ms delay keeps a quick
arrow press from flashing it.

`Logic.unknownLinkTip(host)` builds the text: "Link not recognized: <host>.", then "Add it to
joinHosts in ~/.config/omarchy/ominous.json to trust it.", plus "It has non-Latin characters
and may imitate another address." when the host has non-ASCII characters. `Logic.shortHost`
keeps the last 32 characters after "…", since the end of a host is what identifies it.

### Seeing it: `shoot-card.sh` takes a link

`tools/shoot-card.sh` gains an optional sixth argument, the link, so an unknown-link card can be
photographed the same safe way (opaque veil, no desktop). Selecting Join for the tooltip picture
uses `wtype` while the overlay is open, as `tests/live.sh --keys` does.

## Risks / Trade-offs

- [Users of a service outside the default see Dismiss selected after the update] → The
  changelog marks the change as breaking behavior and says how to add the host; the tooltip
  says it on the card itself.
- [A listed host's subdomains are trusted too, including ones its owner lets customers create]
  → Default entries are the services' meeting hosts (`meet.google.com`, not `google.com`), and
  the docs state the subdomain rule so a user adds hosts knowingly.
- [The tooltip as a Qt Quick `ToolTip` inside a layer-shell `PanelWindow`] → It is an item in the
  same window, not a new window; checked on the live card before the change is done.
- [Button too wide with a long host] → `shortHost` caps the label; a live check with a very long
  host confirms the card keeps its size.
