# Tasks

## 1. Reading the file

- [x] 1.1 `Logic.stripJsonc`: drop a leading byte order mark, `//` comments and trailing commas outside strings, keep strings whole. Unit tests: `https://` and `a//b` inside strings, escaped quotes, a comment on the last line without a newline, trailing commas in nested lists and objects, a byte order mark, a plain file unchanged
- [x] 1.2 `Logic.parseConfig` uses it and returns `unknownKeys` (top level, sorted, `$schema` excluded). Unit tests: commented option, misspelt key, `$schema` not reported, broken file still gives defaults and an error
- [x] 1.3 `Service.qml`: keep `unknownKeys` and `configError`, add both to `status`, log one line per read when set. Verify `tools/lint.sh` passes

## 2. Printing the config

- [x] 2.1 `Logic.CONFIG_FIELDS` (key, default, description, schema; display order) with `DEFAULTS` derived from it, and `Logic.formatConfig(cfg, unknownKeys)` with the `$schema` key. Unit tests: `normalizeConfig` accepts every default unchanged; user values kept, defaults elsewhere; unknown keys in the header; the output parses back to the same config
- [x] 2.2 `Logic.configSchema()`. Unit tests: one property per field with its default and description, `$schema` allowed, every default within its own type, enum and range
- [x] 2.3 IPC `config` in `Service.qml` returning that text. Verify it is listed by the docs test on IPC commands
- [x] 2.4 `tools/make-config-docs.mjs` writes `docs/ominous.example.jsonc` and `docs/ominous.schema.json`; unit tests compare both with the code and parse the example back to the defaults. Verify the tests fail after editing a description in `CONFIG_FIELDS`, then pass after regenerating
- [x] 2.5 Check the schema in a real editor: open the example in VS Code or Neovim with a JSON language server and confirm key completion and an error on `"leadSeconds": "x"` (manual; note the result in this task) **Done so far:** a real validator (python `jsonschema`, draft 2020-12) accepts the schema, the defaults, an empty file, and `$schema` plus an unknown key, and flags a text `leadSeconds`, `leadSeconds` over 3600, `dim` over 1, a bad `mode`, a bad theme name, an unknown mode under `themes` and a non-boolean `onlyWithLink`. **Editor:** the user opened a copy of the example in VS Code with a local `$schema` path and confirmed key completion with descriptions, hover with the default, errors on a wrong type or out of range, the two values offered for `mode`, no error for an unknown key or a `//` comment. **Not covered:** the real GitHub URL, which works only once `docs/ominous.schema.json` is on `main`.

## 3. Docs and checks

- [x] 3.1 `docs/configuration.md`: comments and trailing commas, the example file, the schema and how to make an editor treat `ominous.json` as JSONC, `config` with the `.new` / `diff` / `mv` steps, `unknownKeys` and `configError`. `docs/usage.md` and `CLAUDE.md`: the `config` command. Verify the docs tests pass
- [x] 3.2 `tests/live.sh`: `status` has `unknownKeys` and `configError`; `config` prints text that parses to the same config `status` shows; `ominous.json` is unchanged afterwards (already checked by checksum). Verify `mise exec -- tests/run.sh --restart` passes
- [x] 3.3 `CHANGELOG.md` under `Unreleased`: Added (comments in `ominous.json`, `config`, unknown keys reported, example file, JSON Schema for editors). Verify the changelog test passes
- [x] 3.4 Fix `tests/run.sh`, found while applying 2.2: a suite that throws while it is being defined shows `✖` but is in neither the pass nor the fail count, so `run.sh` (and the CI) said OK with node exiting 1. It now also fails when node's exit status is not 0. Verify a deliberately broken suite makes `run.sh --unit` fail and name it, and that the run is green again after
