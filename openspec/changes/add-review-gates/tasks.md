# Tasks

## 1. Every push

- [x] 1.1 `.githooks/pre-push`: run `tests/run.sh --unit` for every push except one that only deletes refs (through `mise exec --` when `mise` is on the path), block the push on failure with a hint about `--no-verify`. `tools/lint.sh` shellchecks it and `tests/style.test.mjs` checks its doc comment. Verify: the hook passes on a clean tree, and exits non-zero with a deliberately failing unit test (reverted afterwards)
- [x] 1.2 Enable it in this checkout with `git config core.hooksPath .githooks` (ask the user first). Verify `git config core.hooksPath` prints `.githooks`

## 2. End of every change

- [x] 2.1 `openspec/config.yaml`: `rules.tasks` with the Review group rule. Verify `openspec instructions tasks --change add-review-gates --json` returns the rule

## 3. Before every release

- [x] 3.1 `docs/development.md`: "Security" section (sources, uses, rules, tests; APIs not allowed; how to audit), the hook in "Checks", `.githooks/` in "Layout", the audit and marketplace steps in "Releasing". Verify the docs tests pass
- [x] 3.2 Unit test for the APIs not allowed in `*.qml`, `components/*.qml` and `Logic.js`, with its list checked against the Security section. Verify it passes, and fails when `Image {}` is added to a component (reverted afterwards)
- [x] 3.3 `.claude/skills/ominous-release/SKILL.md`: `config` in the public surface; step "Audit"; new config keys checked against the changelog; the GitHub release with `gh` in the hand-over; step "Marketplace" for a submission in review and for a listed plugin. Verify the skill tests pass (every named path exists)
- [x] 3.4 `CLAUDE.md`: the hook, the Review group and the Security section, in a few lines. Verify `mise exec -- tests/run.sh --unit` passes

## 4. Review

- [x] 4.1 Code review and security review of this change's diff against the proposal and the design, with the Security section as the map; fix the findings or report them to the user
