# Proposal

## Why

The calendar name rendered as rich text (marketplace issue omacom/omarchy-plugin-marketplace#10156)
reached a submission because nothing in the cycle looks at code with an attacker in mind: the
tests prove what they were written to prove, and a line that is safe in one place becomes
unsafe when it moves. The audit that followed also found the join-link problem fixed by
`known-join-hosts`. Reviews need a fixed place in the cycle, at the level where each one
finds the most, before 0.3.0 ships as the first release under them.

## What Changes

Three levels of review, each where it is cheapest and still useful:

- **Every push: automated checks.** A `pre-push` git hook in `.githooks/` runs
  `tests/run.sh --unit`, so a broken commit does not reach GitHub; it is enabled per checkout
  with `git config core.hooksPath .githooks`. The CI stays as it is.
- **End of every change: code and security review of its diff.** A rule for the `tasks`
  artifact in `openspec/config.yaml` makes the last group of every change's tasks "Review":
  a code review and a security review of the change's diff, read against its proposal and
  specs, before the commit. Findings are fixed in the change or reported to the user.
- **Before every release: a full security audit.** `docs/development.md` gains a "Security"
  section: where untrusted data enters, where it is used, the rule that keeps each use safe
  and the check that proves it. The `ominous-release` skill gains a step that walks that map
  over the whole code before the tag; a finding stops the release.
- A unit test fails when the plugin's QML or JavaScript uses an API that runs or loads
  something from a string (`eval`, `Qt.createQmlObject`, `Qt.openUrlExternally`, `Loader`
  sources, `Image`, `XMLHttpRequest`): a new use has to be argued in the Security section first.
- The `ominous-release` skill also: names `config` among the IPC commands and checks that
  every new `ominous.json` key is in the changelog; creates the GitHub release with `gh` after
  the user's push and consent; and has a marketplace step, for a submission still in review
  (edit the issue so the bots re-validate the new commit, reply to the maintainer) and for a
  listed plugin (the "Plugin verification" form, "Verify and publish a newer upstream commit").

## Capabilities

### New Capabilities
None. These are development process and tools; nothing the plugin does changes, so the change
sets `skip_specs: true`.

### Modified Capabilities
None.

## Impact

New: `.githooks/pre-push`, a unit test for forbidden APIs. Changed: `openspec/config.yaml`
(`rules.tasks`), `.claude/skills/ominous-release/SKILL.md`, `docs/development.md` (Checks,
Security, Releasing, Layout), `CLAUDE.md`, `tools/lint.sh` and `tests/style.test.mjs` (the hook
is a script too). Not in the changelog: users see nothing. The version stays 0.3.0.
