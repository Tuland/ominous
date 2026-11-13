# Tasks

## 1. Links out of git

- [x] 1.1 `git rm --cached` the six `.claude/skills/openspec-*` links; `.gitignore` ignores each of them by name, under "This repository", with the reason
- [x] 1.2 `tests/packaging.test.mjs`: a test that git tracks no symlink (`git ls-files -s`, mode `120000`)
- [x] 1.3 `docs/development.md`: `.agents/skills/` in the layout table, and the untracked links

## 2. Checks

- [x] 2.1 `mise exec -- tests/run.sh --unit` passes; the new test fails when a link is staged (checked by hand, then unstaged)

- [x] 2.2 Review findings: the links are ignored by name, not by an `openspec-*` pattern that could hide a real folder; the spec says so; the test reads `git ls-files -s -z`. The untracked links under `.opencode/node_modules` need nothing: the marketplace reads the commit through the GitHub API

## 3. Review

- [x] 3.1 Code review and security review of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the specs, the design and the Security section; fix the findings or take them to the user
