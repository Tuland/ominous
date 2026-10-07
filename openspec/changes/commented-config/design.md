# Design

## Context

See `proposal.md` for the motivation. `Service.qml` watches `ominous.json` with a `FileView`
and hands its text to `Logic.parseConfig`, which calls `JSON.parse` and then
`Logic.normalizeConfig`; a parse error goes to the shell log only. The known keys are those of
`Logic.DEFAULTS`. `status` already prints the effective `config`, defaults included. The rule
that `ominous.json` is never written stays (`CLAUDE.md`, and the marketplace checklist).
Logic.js runs in QML's JavaScript engine and under node for the tests; it has no JSONC
parser, and none may be added as a dependency.

## Goals / Non-Goals

**Goals:**
- Comments and trailing commas in `ominous.json`, with no change for files that have neither.
- Unknown keys and unreadable files visible in `status` and the log.
- One source for every description of the config: one declaration per key gives the defaults,
  the printed comments, the example file and the JSON Schema.
- Editor help (completion, validation) through a JSON Schema.

**Non-Goals:**
- Writing, merging or migrating the user's `ominous.json`.
- `/* */` block comments, unquoted keys, single quotes or other JSON5 features.
- Reporting invalid values (a known key with a wrong type or out of range): they keep falling
  back to the default as documented.
- Keeping the user's own comments: `config` prints Ominous's comments, not theirs.
- A validation library (Zod, Valibot, Ajv): Logic.js runs in QML's JavaScript engine, with no
  package loading; a bundled copy would be third-party code to keep current, lint and scan,
  with no guarantee it runs there. Validation stays the hand-written `normalizeConfig`.
- Renaming the file to `ominous.jsonc` or reading two names.

## Decisions

### A string-aware pass before `JSON.parse`

`Logic.stripJsonc(text)` drops a leading UTF-8 byte order mark (`\uFEFF`), then walks the text once, tracking whether it is inside a string (and
after a backslash inside one). Outside strings it drops `//` up to the end of the line, and a
comma followed only by whitespace or comments before `]` or `}`. Inside strings it copies
everything. The result goes to `JSON.parse`, so all validation stays JSON's. Positions in a
parse error may shift by the removed text; the error says only that the file is not valid.

- *Alternative: a regular expression.* Rejected: `https://` inside a string is exactly the
  case a regex gets wrong.
- *Alternative: a JSON5 library.* Rejected: a dependency in a plugin that has none, for two
  features.

### `parseConfig` reports, the service relays

`parseConfig` returns `{ config, error, unknownKeys }`: the top-level keys of the parsed object
that are not in `DEFAULTS`, sorted. The service keeps `unknownKeys` and `configError`, adds them
to `status`, and logs one line per read when either is set. Nested keys (inside `themes`) are
not reported; `normalizeConfig` already ignores unknown modes there.

### One declaration per key

`Logic.CONFIG_FIELDS` lists every key in display order: `key`, `default`, a one-line
`description`, and `schema`, the JSON Schema fragment for its value (type, enum, minimum,
maximum, items). Everything else derives from it:

```
CONFIG_FIELDS --+--> DEFAULTS                      (what normalizeConfig falls back to)
                +--> formatConfig()  --> `config` output, docs/ominous.example.jsonc
                +--> configSchema()  --> docs/ominous.schema.json
```

This is the Pydantic idea without a library: one declaration, many uses. `normalizeConfig`
stays hand-written (it also trims, lowercases, rounds and checks theme names), and a unit test
checks it accepts every field's default unchanged, so the declaration and the validation
cannot drift apart silently. `known-join-hosts` later adds `joinHosts` to the table, with its
optional hosts as commented lines.

`Logic.formatConfig(cfg, unknownKeys)` prints a header comment (what the file is, that the card's
saved mode and theme live in the state files, where the reference is, unknown keys if any), the
`"$schema"` key, then each key as `"key": <JSON value>,` under its description.

### The JSON Schema

`Logic.configSchema()` returns a draft 2020-12 schema: an object with one property per field
(its `schema`, `default` and `description`), plus `$schema` as a string, and
`additionalProperties: true`, so an unknown key is a warning in Ominous and not an error in
the editor either. The printed config and the example point to
`https://raw.githubusercontent.com/Tuland/ominous/main/docs/ominous.schema.json`.

- *Alternative: a path to the installed plugin's copy.* Rejected: the install folder differs
  per user, and `$schema` needs an absolute URI. The trade-off is that `main` may be ahead of the
  installed version; keys are only ever added, so an older install still validates.

### The file keeps its name

`ominous.json` stays the only file read. Editors that do not know it holds comments may mark
them; the docs show how to associate the file with JSONC (VS Code `files.associations`, a
Neovim filetype rule). It is a cosmetic warning in the editor; Ominous reads the file anyway.

The IPC `config` returns `formatConfig(root.config, root.unknownKeys)`. It prints the
effective config from `ominous.json` only: the mode and theme saved by the card or by
`theme` (state files) are not part of `ominous.json`, and the header comment says so.

### The example and the schema are generated and compared

`tools/make-config-docs.mjs` loads Logic.js the way the tests do and writes
`formatConfig(normalizeConfig(null), [])` to `docs/ominous.example.jsonc` and
`configSchema()` to `docs/ominous.schema.json`. Unit tests compare both files with the same calls
and, on a difference, name the script. The test also parses the
file back through `parseConfig` and checks it equals the defaults with no unknown keys and no
error, which exercises the comment support on a real file.

## Risks / Trade-offs

- [A stripping bug changes a valid file's meaning] → Unit tests for strings with `//`, escaped
  quotes, comments at the end of the file without a newline, nested trailing commas, and a
  file with none of these, which must parse exactly as before.
- [Users replace their file with `config` output and lose their own comments] → The docs show
  the `> ominous.json.new`, `diff`, `mv` sequence, never a direct redirect onto the file.
- [Log noise: the file is re-read on every save] → One line per read, only when something is
  wrong.
- [The schema is wrong but well-formed] → No JSON Schema validator is available offline without a
  dependency; tests check its structure (one property per field, types among JSON Schema's,
  each default within its own range) and that the example file's values satisfy the simple
  constraints used (type, enum, minimum, maximum).
