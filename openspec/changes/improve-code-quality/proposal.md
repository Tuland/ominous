# Proposal

## Why

The code works and its decisions are unit tested, but nothing checks the QML or the scripts
statically, and most functions say what they do only through their name. `qmllint`, run with
the shell's modules on its import path, finds 12 problems of ours: 10 unqualified accesses in
`PixelSprite`, a `palette` property that shadows `Item.palette` from Qt (a latent bug), and an
unused import. Of the 21 QML functions, only the 5 IPC ones carry types. `Logic.js` has 34
functions with no doc comment, and the scripts have headers but no function comments. A common
documentation style, checked by a test, keeps the code readable for the next contributor or
agent.

## What Changes

- Fix the 12 `qmllint` findings of ours. `PixelSprite`'s `palette` becomes `colors` inside the
  component; the theme JSON format keeps `palette`.
- Type every QML function's parameters and return value.
- `tools/lint.sh`: `qmllint` with the shell's modules on the import path, and `shellcheck` on
  every script. The three categories that come from how the shell and Quickshell describe
  their own types (`missing-property`, `signal-handler-parameters`, `uncreatable-type`) are
  reported as info; anything else fails. Where the Omarchy shell is not installed (GitHub),
  `qmllint` is skipped with a notice and `shellcheck` still runs.
- `tests/run.sh --unit` runs `tools/lint.sh`, so the CI runs it too.
- `mise.toml` pins `node` and `shellcheck`, and the CI installs them from it, so the local
  checks and the CI run the same versions.
- `tools/shoot-card.sh` refuses a capture when anything besides the card is on the veil: a
  notification above the overlay once put part of the desktop into a picture.
- Doc comments everywhere, in one family of styles:
  - JavaScript and QML functions: JSDoc (`/** ... @param ... @returns ... */`); in QML the
    types stay in the signature, not in the comment.
  - QML components: a block on top saying what the component is, its inputs (properties) and
    outputs (signals).
  - Bash: the Google Shell Style Guide (file header; function comments with `Globals:`,
    `Arguments:`, `Outputs:`, `Returns:`).
  - Python: Google style docstrings.
  A one-line function with a clear name gets a one-line summary only. Inline comments stay
  for a non-obvious why.
- A unit test that every `Logic.js` function has a JSDoc block with one `@param` per
  parameter, every QML component and function has a doc comment, and every script has a
  header.
- `docs/development.md` and `CLAUDE.md` describe the style and the lint step; the context in
  `openspec/config.yaml`, which still named a removed test file and three config keys, points
  to them instead of repeating details.

## Capabilities

### New Capabilities
None. Code quality, tooling and documentation only; nothing the plugin does changes, so the
change sets `skip_specs: true`.

### Modified Capabilities
None.

## Impact

Changed: `Alert.qml`, `Service.qml`, `Logic.js`, every file in `components/`, `tests/*.sh`,
`tools/*` (including `tools/shoot-card.sh`), `tests/run.sh`, `docs/development.md`, `CLAUDE.md`, `openspec/config.yaml`. New: `tools/lint.sh`, `mise.toml`,
`tests/style.test.mjs`. The plugin's behavior is unchanged: the unit and live suites must pass
as before. The CI gains `shellcheck` (preinstalled on the GitHub runners).
