# Proposal

## Why

The marketplace refused the 0.3.1 update (omacom/omarchy-plugin-marketplace#14910) with
`manifest.json: symlinks are not allowed in plugin folders`: the plugin folder is the whole
repository, and the OpenSpec 2.0 upgrade (`632a9db`) tracked six symlinks,
`.claude/skills/openspec-*` -> `../../.agents/skills/...`. OpenSpec has no option to copy the
skills instead of linking them.

## What Changes

- The six links leave git and are ignored (each named in `.gitignore`); they
  stay on disk, where `openspec update` makes them again. The skills themselves stay tracked
  once, in `.agents/skills/`.
- A packaging unit test fails when git tracks any symlink, so the pre-push hook and the CI stop
  one before it reaches the marketplace.
- `docs/development.md` names `.agents/skills/` and says why the links are not tracked.

## Capabilities

### New Capabilities

### Modified Capabilities

- `plugin-packaging`: a requirement that the repository tracks no symlinks.

## Impact

`.gitignore`, `tests/packaging.test.mjs`, `docs/development.md`, the git index. No change to the
plugin's code, config or commands. On a fresh clone, Claude Code sees the OpenSpec skills after
`openspec update`.
