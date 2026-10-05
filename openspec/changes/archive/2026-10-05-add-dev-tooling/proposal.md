# Proposal

## Why

Work on the characters went wrong in ways a future session would repeat: teeth drawn as a
solid white bar, fangs on a human, lips that read as a moustache, and screenshots that caught
the user's desktop. The checks were also only local, and `tests/theme-check.sh` never showed
`boss` under a light theme. Before tagging 0.2.0, the repository should carry what a contributor,
or an agent, needs to change themes safely, and a check that runs on every push.

## What Changes

- `tools/shoot-card.sh`: photographs one theme in one phase. It summons a synthetic meeting on
  an opaque veil, so the picture holds only the card. `tools/make-preview.sh` builds on it.
- `.claude/skills/ominous-theme/`: an agent skill for drawing and reviewing characters, with the
  rules (original art, 16x16, animation that grows with urgency, palette roles), the pitfalls
  already met, and the workflow through `tools/draw-themes.py`, `shoot-card.sh` and the tests.
- `tests/theme-check.sh` also shows `boss` under the light and the dark Omarchy theme, and takes
  its pictures with `shoot-card.sh`: no screen crops, and the user's own theme files stay untouched.
- `.github/workflows/tests.yml`: `tests/run.sh --unit` on every push and pull request, with
  Node 24 and actions pinned to full commits.
- `CLAUDE.md` and `docs/development.md`: point to the skill and to `shoot-card.sh`, forbid raw
  screen captures, describe the CI, and state that every change goes through OpenSpec.

## Capabilities

### New Capabilities
None. These are development tools; nothing the plugin does changes, so the change sets
`skip_specs: true`.

### Modified Capabilities
None.

## Impact

New: `tools/shoot-card.sh`, `.claude/skills/ominous-theme/SKILL.md`,
`.github/workflows/tests.yml`. Changed: `tools/make-preview.sh`, `tests/theme-check.sh`,
`CLAUDE.md`, `docs/development.md`. The plugin's code and behavior are unchanged.
