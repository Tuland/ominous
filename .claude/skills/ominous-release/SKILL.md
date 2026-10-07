---
name: ominous-release
description: Cut an Ominous release, or decide whether one is due and which version it should be. Use when asked to release, tag, publish a version, bump the version, write release notes or the changelog, or when asked "what version is next" or "should we release".
---

# Releasing Ominous

The version lives in one place, `manifest.json` (`version`). `CHANGELOG.md` says what each
version changed, and a git tag `vX.Y.Z` marks the commit. Omarchy and the marketplace read only
the manifest; the tag is for people and for GitHub releases. `tests/packaging.test.mjs` fails
when the newest released version in the changelog differs from the manifest.

Never push and never force-move a pushed tag: those steps are the user's. Create a GitHub
release and edit a marketplace issue only after the user says so. Ask before each command that
changes the live system.

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
`config`, `themes`, `theme`), the user theme format (`docs/custom-themes.md`), the state file paths and
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

## 2.5. Audit

Run the audit that `docs/development.md` describes under "Security", over the whole code and not
the diff since the tag: follow each untrusted source in the map to each of its uses, check the
tests that hold each rule, and update the map where the code changed. Report the result to the
user in a short table (source, use, verdict). A finding that is not fixed stops the release:
open an OpenSpec change for it and start again afterwards. Never skip this step because the
changes since the tag "do not touch" input handling: the point is the old code in a new context.

## 3. Cut it

1. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - <today, YYYY-MM-DD>` and put a
   new empty `## [Unreleased]` above it. Check the entries: user-visible only, and every `ominous.json` key added since the last tag is
   named (`git show <tag>:Logic.js | grep -o '^  { key: "[A-Za-z]*"'` against the same on the
   working tree; before the tag has `CONFIG_FIELDS`, compare `DEFAULTS` by eye), grouped as
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

Tell the user to run `git push origin main` and `git push origin vX.Y.Z`. Once they say it is
pushed: watch the `tests` workflow with `gh run list` and `gh run watch` until it is green, then
show the user the changelog section and, with their consent, create the GitHub release:
`gh release create vX.Y.Z --title "Ominous X.Y.Z" --notes-file <the section>`.

## 5. Marketplace

The facts come from the marketplace's own `SUBMISSION.md` (clone `omacom/omarchy-plugin-marketplace`
into the scratchpad); read it again, since the process may change.

- **Submission still in review** (labels such as `needs-fixes`): the maintainer's approval is
  bound to the exact commit its bots validated, so a new commit needs a new validation. Run
  `scripts/validate-submission.mjs --repo=<repo URL>` and `scripts/security-baseline.mjs` from
  that clone on the new HEAD first. Show the user a reply for the issue: what changed, the
  commit and the test for each point the maintainer raised, and a pointer to the changelog. Post
  it on their word, then ask them to edit the issue (any edit) so the bots validate again.
- **Plugin listed**: the user opens the marketplace's "Plugin verification" form, chooses
  "Verify and publish a newer upstream commit" and gives the release commit's SHA. Until it is
  approved, the site shows the new version as unverified. Prepare the SHA and a one-paragraph
  summary for them.

## When a release is worth it

After an OpenSpec change is archived, its user-visible items go under `Unreleased`. Then say
whether to release:

- Now, as a patch: a fix for something users meet (a card that does not show, text out of
  the card).
- Soon, as a minor: a finished, archived addition.
- Before a breaking change starts: release what is stable, so the break ships alone.
- Before the repository goes public or is submitted to the marketplace.
- Not with an active OpenSpec change, with failing tests, or for tooling-only changes.
