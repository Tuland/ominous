# Proposal

## Why

`Logic.js` now documents every function with JSDoc types and `tools/draw-themes.py` has Google
docstrings, but nothing checks that the types are true: a typedef can drift from the code and
nobody notices. A type checker turns the documentation into a check. A trial run finds 39
errors from `tsc` 7.0.2 on `Logic.js` (mostly types too loose to index, such as `Object` or
`{}`) and 113 from `mypy --strict` on the Python script (mostly missing annotations).

## What Changes

- `mise.toml` pins `typescript` 7.0.2 (`npm:typescript`, the native compiler, the line
  TypeScript continues on), `mypy` 2.4.0, and `uv` 0.12.23, which installs `mypy` (no `pipx`),
  so the CI and every checkout run the same versions.
- `tools/lint.sh` also runs `tsc --checkJs` (strict) on `Logic.js` and `mypy --strict` on
  `tools/draw-themes.py`. A missing `tsc` or `mypy` fails with a hint to run `mise install`,
  like a missing `shellcheck`.
- `Logic.js`: the JSDoc types made precise enough to pass, with no change to the code's
  behavior (the unit tests prove it).
- `tools/draw-themes.py`: type hints on every function and module-level value.
- `docs/development.md` and `CLAUDE.md`: the type checks in the code style and the checks.

## Capabilities

### New Capabilities
None. Tooling and annotations only; nothing the plugin does changes, so the change sets
`skip_specs: true`.

### Modified Capabilities
None.

## Impact

Changed: `mise.toml`, `tools/lint.sh`, `Logic.js` (comments, and the parentheses of five JSDoc casts), `tools/draw-themes.py`,
`docs/development.md`, `CLAUDE.md`. The shipped themes and the plugin's behavior are
unchanged: `tools/draw-themes.py --check`, the unit and the live suites must pass as before.
