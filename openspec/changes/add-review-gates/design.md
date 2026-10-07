# Design

## Context

Today the cycle has the unit tests, `tools/lint.sh` and the CI (`tests/run.sh --unit` on every
push to GitHub). There is no git hook (`core.hooksPath` unset), `openspec/config.yaml` has a
`context` and no `rules`, and the `ominous-release` skill goes from "propose the version"
straight to "cut it". The audit of 2026-10-07 (one sink unsafe, one design gap, eight safe)
exists only in the conversation that produced it. Agents in this repository are Claude Code
and opencode: both read `openspec/config.yaml` through the OpenSpec CLI, and both have the
OpenSpec commands. The plugin code has none of the APIs that run or load from a string; it
opens a link in one place (`Alert.join`), starts two fixed commands and reads files at paths
built from slugs.

## Goals / Non-Goals

**Goals:**
- Each level of review has one place that triggers it, so it does not depend on memory: the
  hook for pushes, the tasks rule for changes, the release skill for releases.
- The security knowledge of the audit lives in the repository, where the next audit and the
  per-change review start from it.
- An unsafe API cannot enter the code without someone deciding to allow it.

**Non-Goals:**
- Required pull requests or branch protection that needs a second person: one maintainer.
- Running the live checks in the hook: they take the keyboard and need the shell.
- A third-party scanner (Semgrep, CodeQL): no QML support, and the marketplace already runs its
  own scanner on submissions.
- Naming one review tool in the rule: Claude Code (`/security-review`, a review agent) and
  opencode differ; the rule says what to review and against what.

## Decisions

### The hook runs the unit checks, through mise when present

`.githooks/pre-push` is a Bash script with the same doc comment style as the other scripts. It
runs `mise exec -- tests/run.sh --unit` when `mise` is on the path (a hook runs in a
non-interactive shell, where mise's activation does not happen), plain `tests/run.sh --unit`
otherwise, and blocks the push on failure with a one-line hint (`git push --no-verify` to
bypass on purpose).

It checks every push, whatever the branch or tag: a broken branch should not reach GitHub
either, and with one developer a filter on `main` would save nothing. It reads the ref lines
git gives it on standard input and skips a push that only deletes refs (all-zero local sha) or
has none, since there is nothing to check; otherwise a failing test would stop a branch from
being deleted. Git has no versioned hooks folder; `git config core.hooksPath .githooks`
enables it per checkout and `docs/development.md` says so.

- *Alternative: a hook manager (lefthook, pre-commit).* Rejected: a dependency for one hook.
- *Alternative: pre-commit instead of pre-push.* Rejected: the unit run with lint takes some
  seconds, too slow for every commit, and a commit is not yet shared.

### The Review group is a rule on the tasks artifact

`openspec/config.yaml` gets `rules.tasks`: the last group of tasks is "Review", with a code
review and a security review of the change's diff, read against proposal, specs and the
Security section; findings are fixed in the change, or reported to the user when they need a
decision; done before the commit. OpenSpec hands the rules to whoever writes `tasks.md`, so
every new change carries the group, and apply cannot finish without ticking it. This change's
own tasks end with that group.

### The Security section is the audit's map

`docs/development.md` gets "Security": a table of untrusted sources (OmaCal agenda fields, the
IPC payload, user theme files, `state.json` and `themes.json`, `ominous.json`) to the places
they are used (card text, the browser launch, file paths, the journal and `status`), each with
its rule (`Text.PlainText`, `Logic.safeUrl` and `joinHosts`, `Logic.isThemeName`, no titles in
logs or `status`) and the test that holds it. Below it: the APIs not allowed and how to argue
for one, and how to audit before a release (walk every source to every use over the whole
code, not the diff; update the map).

### A test keeps the dangerous APIs out

A unit test in `tests/style.test.mjs` reads every `*.qml` and `Logic.js` and fails on `eval(`,
`Qt.createQmlObject`, `Qt.openUrlExternally`, `Loader`, `Image`, `AnimatedImage` and
`XMLHttpRequest`, naming the file and the Security section. The list is in the test and in the
docs; a test checks they match, as the docs tests do for config keys.

- *Alternative: also pin `execDetached` to one call.* Rejected: the audit covers it, and a
  count would fail on a harmless refactor.

### The release skill: audit, changelog keys, GitHub release, marketplace

New step "Audit" between the version proposal and the cut: run it as the Security section
describes, report the result to the user, stop on a finding. In the cut, compare the keys of
`CONFIG_FIELDS` at the last tag and now, and require each new one in the changelog section. In
the hand-over, the agent creates the GitHub release with `gh release create` from the
changelog section, after the user's push and with their consent. New step "Marketplace": in
review, edit the submission issue so its bots re-validate the new commit and reply to the
maintainer with what changed; listed, open the "Plugin verification" form with "Verify and
publish a newer upstream commit" and the tag's commit. The skill's public surface names the
`config` command.

## Risks / Trade-offs

- [The hook is off in a fresh clone] -> `docs/development.md` and `CLAUDE.md` say how to enable
  it; the CI still catches what it would.
- [A review by an agent can miss things or report noise] -> It is one layer of three, read
  against the spec; the release audit and the marketplace scanner come after it.
- [The forbidden-API test can block a legitimate use] -> It names the Security section, where
  the use is argued and the list changed in the same change.
- [Marketplace steps depend on a third party's process] -> The skill says where the facts come
  from (the marketplace's SUBMISSION.md) so they are checked again at release time.
