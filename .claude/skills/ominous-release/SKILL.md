---
name: ominous-release
description: Cut an Ominous release, or decide whether one is due and which version it should be. Use when asked to release, tag, publish a version, bump the version, write release notes or the changelog, or when asked "what version is next" or "should we release".
---

# Releasing Ominous

The version lives in one place, `manifest.json` (`version`). `CHANGELOG.md` says what each
version changed, and a git tag `vX.Y.Z` marks the commit. Omarchy and the marketplace read only
the manifest; the tag is for people and for GitHub releases. `tests/packaging.test.mjs` fails
when the newest released version in the changelog differs from the manifest.

Never push, never publish a GitHub release and never force-move a pushed tag: those steps are
the user's. Ask before each command that changes the live system.

## 1. Starting point

Stop and report if any of these fails:

- `git status --short` is empty.
- `openspec list` shows no active change (an open change is unfinished work).
- `git fetch origin && git status -sb` shows `main` in step with `origin/main`.
- `tests/run.sh --unit` passes.

## 2. Propose the version

List what changed since the last tag: `git describe --tags --abbrev=0`, then
`git log --oneline <tag>..HEAD`, the folders in `openspec/changes/archive/` dated after the tag,
and the `Unreleased` section of `CHANGELOG.md`. Classify each item by what a user sees. The
public surface is the `ominous.json` keys, the IPC commands (`test`, `preview`, `status`,
`themes`, `theme`), the user theme format (`docs/custom-themes.md`), the state file paths and
the plugin ID.

| Change | Example | From 1.0.0 | In 0.x |
|---|---|---|---|
| Fix, nothing new to see | a caption that overflowed | patch | patch |
| Compatible addition | a config key, a theme, a command | minor | minor |
| Breaking | a key renamed, a theme field changed, a command removed | major | minor, with a warning in the changelog |
| Tooling, tests, CI, skills | `tests/run.sh` | none | none |

The highest class wins. Propose 1.0.0 only when all of these hold: Ominous is public and listed
on the marketplace, the config keys and the theme format did not change in the last release,
and nothing planned would break them. Show the user the list, the class of each item and the
proposal with one line of reasoning, for example:

```
Since v0.2.0:
- add-escalation (archived change, adds a requirement): compatible addition -> minor
- Fix caption overflow (commit): fix -> patch
Proposed: 0.3.0 (one compatible addition). Not 1.0.0: not public yet.
```

Wait for the user's choice before changing any file.

## 3. Cut it

1. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - <today, YYYY-MM-DD>` and put a
   new empty `## [Unreleased]` above it. Check the entries: user-visible only, grouped as
   Added / Changed / Fixed (Removed and Security when needed), breaking items first with what
   the user does about them. Update the compare links at the bottom.
2. Set `version` in `manifest.json` to `X.Y.Z`.
3. Run `tests/run.sh --restart` (live checks, after an `omarchy restart shell`). If the card's
   look changed, also run `tests/theme-check.sh <scratchpad dir>` (it switches the Omarchy
   theme for a minute: ask first) and regenerate the picture with `tools/make-preview.sh`,
   showing it to the user before committing.
4. Commit only the files named, with the message `Release X.Y.Z`.
5. `git tag -a vX.Y.Z -m "Ominous X.Y.Z"` on that commit.

## 4. Hand over to the user

Tell the user to run `git push origin main` and `git push origin vX.Y.Z`, to check that the
`tests` workflow on GitHub is green, and to publish a GitHub release from the tag with the
changelog section as its text.

## When a release is worth it

After an OpenSpec change is archived, its user-visible items go under `Unreleased`. Then say
whether to release:

- Now, as a patch: a fix for something users meet (a card that does not show, text out of
  the card).
- Soon, as a minor: a finished, archived addition.
- Before a breaking change starts: release what is stable, so the break ships alone.
- Before the repository goes public or is submitted to the marketplace.
- Not with an active OpenSpec change, with failing tests, or for tooling-only changes.
