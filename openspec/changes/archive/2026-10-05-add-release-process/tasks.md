# Tasks

## 1. Changelog

- [x] 1.1 Write `CHANGELOG.md` (Keep a Changelog): an empty `Unreleased`, then 0.2.0 and 0.1.0 from the git history and the archived changes, with the ID change and what a 0.1.0 user does, and compare links for `v0.1.0` and `v0.2.0`. Verify every item is user-visible and no personal data appears
- [x] 1.2 Link it from the README's documentation index. Verify the docs link test passes
- [x] 1.3 Add a test in `tests/packaging.test.mjs`: an `Unreleased` section exists and the newest released version equals the manifest `version`. Verify it fails when the manifest version is changed by hand, then passes again

## 2. Release skill

- [x] 2.1 Write `.claude/skills/ominous-release/SKILL.md`: starting checks, the version proposal (what changed since the last tag, SemVer with the 0.x rules and the conditions for 1.0.0, the user decides), the release steps up to a local annotated tag, the steps left to the user, and when a release is worth it. Verify the skill is listed by Claude Code
- [x] 2.2 Extend the docs test on skill paths from `ominous-theme` to every `ominous-*` skill. Verify it fails when a path in the release skill is renamed

## 3. Notes

- [x] 3.1 `CLAUDE.md`: after archiving a change, add its user-visible changes under `Unreleased` and say whether to release and which version. `docs/development.md`: a short release checklist that points to the skill. Verify `tests/run.sh --unit` passes

## 4. Release 0.2.0

- [x] 4.1 Commit, then move the local `v0.2.0` tag to that commit (not pushed yet), following the skill. Verify `git tag --points-at HEAD` shows `v0.2.0` and `v0.1.0` still points at the first release commit
