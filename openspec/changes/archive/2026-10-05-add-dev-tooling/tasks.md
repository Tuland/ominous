# Tasks

## 1. Pictures of the card

- [x] 1.1 Add `tools/shoot-card.sh <theme> <mode> <phase> <out> [title]`: synthetic meeting with `dim: 1`, capture of the focused monitor, trimmed to the card. Verify a shot holds only the card, and that an unknown theme or mode is refused
- [x] 1.2 Rebuild `tools/make-preview.sh` on top of it, with the canvas in the theme's background color. Verify a regenerated `preview.png` matches the committed one except the clock digits

## 2. The ominous-theme skill

- [x] 2.1 Write `.claude/skills/ominous-theme/SKILL.md`: rules for the character, the pitfalls already met, and the workflow through `tools/draw-themes.py`, `tools/shoot-card.sh`, `tests/theme-check.sh` and the tests. Verify the skill is listed by Claude Code
- [x] 2.2 Add a unit test that every repository path the skill names exists. Verify it fails when a path in the skill is renamed

## 3. Light and dark check for every character

- [x] 3.1 Make `tests/theme-check.sh` show `boss` too. Verify the script parses (`bash -n`)
- [x] 3.2 Take its pictures with `tools/shoot-card.sh` instead of `grim -g` crops, with the theme in the payload, so it no longer swaps the user's `marine.json`. Verify the script parses and no longer names `grim` or the user themes folder
- [x] 3.3 Run `tests/theme-check.sh <dir>` (switches the Omarchy theme for a minute, with the user's consent) and look at `boss` under the light theme. Verify it ends with `PASS everything is back as it was`

## 4. Continuous integration

- [x] 4.1 Add `.github/workflows/tests.yml`: `tests/run.sh --unit` on push and pull request, Node 24, read-only permissions, actions pinned to full commits. Verify the YAML parses and the same command passes in a clean environment (no Omarchy config, empty HOME)
- [x] 4.2 Fix the first CI run, which failed: Node 24 reads `node --test tests/` as a module path (only Node 26 accepts a folder). `tests/run.sh` passes `'tests/*.test.mjs'` with `--test-reporter=spec`, whose summary it parses on every Node version. Verify `tests/run.sh --unit` passes in a fresh clone with an empty HOME on the system Node 22, and locally on Node 26
- [x] 4.3 After the next push, check the workflow run on GitHub is green

## 5. Notes for contributors and agents

- [x] 5.1 Update `CLAUDE.md` (skill, `shoot-card.sh`, no raw screen captures, every change goes through OpenSpec) and `docs/development.md` (tools, CI, release step). Verify the docs tests pass
