# Proposal

## Why

Ominous is about to tag 0.2.0, and the only record of what changed is the git history. A user
updating the plugin, or a reviewer reading the marketplace listing, needs to see what each
version brought without reading commits; the plugin ID also changed in 0.2.0, which a user of
0.1.0 has to act on. Releases are rare, so their steps are easy to forget: raising the version,
writing the entry, tagging, and choosing the right number (a patch, a minor, or 1.0.0).

## What Changes

- `CHANGELOG.md` in the repository root, in the Keep a Changelog format: an `## [Unreleased]`
  section on top, then one section per released version, newest first, with the date and the
  user-visible changes grouped as Added / Changed / Fixed. Entries for 0.1.0 and 0.2.0, from the
  git history and the archived OpenSpec changes. The 0.2.0 entry says what a user of 0.1.0 does
  about the new plugin ID. Compare links at the bottom, for the tags `v0.1.0` and `v0.2.0`.
- The README's documentation index links to it.
- A packaging test: the newest released version in `CHANGELOG.md` equals the manifest's
  `version`, and an `Unreleased` section is present.
- `.claude/skills/ominous-release/`: an agent skill for cutting a release. It checks the
  starting point (clean tree, no open OpenSpec change, `main` in step with `origin`), proposes
  the version from what changed since the last tag (SemVer, with the rules for 0.x and the
  conditions for 1.0.0) and waits for the user's choice, then moves `Unreleased` to the new
  version, raises `manifest.json`, runs the checks, commits and tags `vX.Y.Z` locally. Pushing,
  the CI check and the GitHub release stay with the user.
- `CLAUDE.md`: after archiving an OpenSpec change, add its user-visible changes under
  `Unreleased` and say whether a release is worth it now, and which version.
- `docs/development.md`: the release checklist becomes short and points to the skill.
- The docs test that checks the paths named by `ominous-theme` covers every `ominous-*` skill.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `plugin-packaging`: adds a requirement for a changelog with an `Unreleased` section and a
  newest released version that matches the manifest.

## Impact

New: `CHANGELOG.md`, `.claude/skills/ominous-release/SKILL.md`. Changed: `README.md`,
`CLAUDE.md`, `docs/development.md`, `tests/packaging.test.mjs`, `tests/docs.test.mjs`. The
plugin's code and behavior are unchanged. The local tag `v0.2.0`, not pushed yet, moves to the
commit that adds the changelog; `v0.1.0` is already on the first release commit.
