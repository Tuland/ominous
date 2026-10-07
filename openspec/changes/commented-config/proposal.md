# Proposal

## Why

`ominous.json` is plain JSON, so it cannot carry a comment: a user cannot keep an option at
hand without it taking effect, and the coming `joinHosts` list needs optional hosts that stay
off until the user enables them. A user also has no way to see every key at once: a key added
in a later release never shows up in their own file, and a misspelt key (`"joinhost"`) is
ignored without a word, so a setting can look applied when it is not. The plugin must keep its
promise never to write `ominous.json`, so the help has to come from reading and printing only.

## What Changes

- `ominous.json` accepts `//` comments and trailing commas (JSONC), and a leading UTF-8 byte
  order mark, which some editors save. Comment markers inside strings, such as the `//` of
  `https://`, are left alone. Files without these read as before. The file keeps its name; the
  docs say how to make an editor treat it as JSON with comments.
- Keys Ominous does not know are reported: `status` gains `unknownKeys`, and the shell log
  names them. A file that cannot be read is reported too: `status` gains `configError`, which
  until now only went to the log.
- New IPC command `omarchy-shell ominous config`: prints a complete `ominous.json` as JSONC,
  with a one-line comment per key, the user's values where set and the defaults elsewhere, and
  the unknown keys listed in a comment at the top. It never writes any file; the user redirects
  it to a new file, compares, and replaces their own if they want.
- `docs/ominous.example.jsonc`: that output with every default, to copy as a starting point. A
  unit test fails when it differs from what the code prints, so it cannot fall behind.
- `docs/ominous.schema.json`: a JSON Schema of the file, so editors complete keys, show what
  each one does and flag wrong values as you type. The printed config and the example start
  with a `"$schema"` key pointing to it, which Ominous accepts and does not report as unknown.
- One declaration per key in Logic.js (default, one-line description, schema) is the single
  source for the defaults, the comments, the example and the schema.
- `docs/configuration.md` and `docs/usage.md` describe comments, the example file, the
  `config` command and the reported keys.

## Capabilities

### New Capabilities
- `configuration`: how `ominous.json` is read (format, unknown and broken input) and how the
  user can see the complete effective configuration.

### Modified Capabilities
None.

## Impact

Changed: `Logic.js` (reading the file, the printed config), `Service.qml` (`config` command,
`status` fields, log lines), `docs/configuration.md`, `docs/usage.md`, `CLAUDE.md` (IPC list),
`tests/` (unit and live). New: `docs/ominous.example.jsonc`, `docs/ominous.schema.json`, a small
script that regenerates both. `ominous.json` is still never written. Part of 0.3.0, before `known-join-hosts`, which adds
`joinHosts` and its optional hosts to the printed config.
