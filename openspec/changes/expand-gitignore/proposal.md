# Proposal

## Why

`.gitignore` lists only `tests/results.log`. The type checks now leave `.mypy_cache/` in the
checkout, which stays out of git only because mypy writes its own `.gitignore` inside it, and
nothing keeps out editor files, OS files, Python bytecode, `node_modules/`, local secrets or
local tool settings. A contributor's first `git add` could pick any of them up.

## What Changes

- `.gitignore` grouped by origin, each group with a comment:
  - this repository's own output (`tests/results.log`);
  - operating systems (Linux, macOS, Windows);
  - editors and IDEs (VS Code, JetBrains, Vim, Emacs, Sublime Text, Zed, Kate);
  - JavaScript and TypeScript (Node, npm, Yarn, pnpm, build info, coverage);
  - Python (bytecode, virtual environments, mypy, ruff, pytest, packaging);
  - QML and Qt (compiled QML and JS caches, qmlls settings, Qt Creator user files);
  - shell and logs (`*.log`, backups, swap files);
  - secrets and local settings (`.env` files, keys, `mise.local.toml`, direnv, Claude Code's
    `settings.local.json`).
  Common entries for tools the repository does not use yet are included, as asked.
- A unit test that no tracked file matches `.gitignore`, so an entry never hides a file the
  repository needs.

## Capabilities

### New Capabilities
None. Repository hygiene only; nothing the plugin does changes, so the change sets
`skip_specs: true`.

### Modified Capabilities
None.

## Impact

Changed: `.gitignore`, `tests/packaging.test.mjs`. No tracked file becomes ignored.
