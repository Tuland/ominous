# Tasks

## 1. Lint

- [x] 1.1 Add `tools/lint.sh`: `qmllint` with a temporary `qs` link to the shell and Quickshell's modules on the import path, the shell-caused categories as info and `--max-warnings 0`; `shellcheck` on `tests/*.sh` and `tools/*.sh`; `qmllint` skipped with a notice where the shell is missing. Verify it reports the 12 findings of ours and fails
- [x] 1.2 Run it from `tests/run.sh --unit` (a failed lint fails the run and is named in `tests/results.log`). Verify a run without the shell (empty HOME, no `/usr/share/omarchy/shell` on the import path) still runs `shellcheck`

## 2. QML fixes and types

- [x] 2.1 Fix the 12 findings: qualify the accesses in `PixelSprite`, rename its `palette` to `colors` (users of the component too), drop the unused import in `PhaseSprite`. Verify `tools/lint.sh` passes
- [x] 2.2 Type every QML function's parameters and return value. Verify `tools/lint.sh` passes, then `omarchy restart shell` and `tests/run.sh --live` pass, and `tests/theme-check.sh` shows every character as before (with the user's consent)
- [x] 2.3 `tools/shoot-card.sh` refuses a capture when anything besides the card shows on the veil (found by 2.2: a notification above the overlay made one picture include part of the desktop). The trimmed box must be centred within 6 px; otherwise the capture is deleted and retried after 3 s, up to three times, then the script fails without a picture. Verify a synthetic capture with a corner box is refused, a clean one accepted, and a real shot still passes

## 3. Doc comments

- [x] 3.1 JSDoc on every function in `Logic.js`, with `{types}`, and one `@param` per parameter
- [x] 3.2 A doc block on every QML component (what it is, inputs, outputs) and on every QML function
- [x] 3.3 Google Shell Style comments in every script (header; a block per function, a `#` line for one-liners); Google style docstrings in `tools/draw-themes.py`
- [x] 3.4 Add `tests/style.test.mjs` for the rules in the design. Verify it fails when a doc comment or a `@param` is removed, then passes

## 4. Notes and checks

- [x] 4.1 `docs/development.md`: the doc styles with one short example each, and `tools/lint.sh`. `CLAUDE.md`: the styles and the lint step in the rules and the checks. Verify the docs tests pass
- [x] 4.2 Bring the context in `openspec/config.yaml` up to date: it named the removed `tests/logic.test.mjs` and only three config keys; it now points to `docs/` and `CLAUDE.md` for details. Verify `openspec validate --all --strict` and the plugin ID test pass
- [ ] 4.3 `tests/run.sh` (unit, lint and live) passes after `omarchy restart shell`; after the push, the CI is green
