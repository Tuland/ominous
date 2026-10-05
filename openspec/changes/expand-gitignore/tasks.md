# Tasks

## 1. Ignore rules

- [x] 1.1 Rewrite `.gitignore` by group (repository output, OS, editors, JavaScript/TypeScript, Python, QML/Qt, shell and logs, secrets and local settings), each with a comment. Verify `git status --ignored` lists `.mypy_cache/` and `tests/results.log` under the new rules and nothing tracked
- [x] 1.2 Add a unit test that `git ls-files -ci --exclude-standard` is empty. Verify it fails when an entry matches a tracked file (e.g. `*.md`), then passes

## 2. Check

- [ ] 2.1 `mise exec -- tests/run.sh --unit` passes; after the push, the CI is green
