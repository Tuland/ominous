# Proposal

## Why

The checks run many times in each development cycle, and a full live run takes about 2.5
minutes: the two checks "a test card stays open across an agenda refresh" and "a preview card
stays open across an agenda refresh" wait for the service's real agenda poll (every 60 s) and
take about 108 s of it, while every other live check takes 1 to 3 s and unit, art and lint
about 2 s together. During that wait the card holds the keyboard. On 2026-11-23 one run failed
the test-card check and the reason was lost, because `check` in `tests/live.sh` discards the
command's output and `tests/results.log` records only the check's name.

## What Changes

- One refresh check instead of two: the test-card one stays; the preview-card one goes, since
  it runs after the test card has already cleared the remembered agenda card and so cannot see
  a missing `shown = null` in `preview` (the decision itself, `Logic.followShown` with nothing
  remembered, is unit tested in `tests/agenda.test.mjs`).
- A unit test reads `Service.qml` and checks that the `test` and `preview` IPC functions both
  clear the remembered agenda card after a successful summon (`if (ok) root.shown = null`),
  like the existing check that the agenda `Process` runs `Logic.AGENDA_COMMAND`. With
  `Logic.followShown(null, ...)` returning `keep`, this covers the glue on every unit run.
- The remaining refresh check runs only with a new `--refresh` flag of `tests/live.sh`, passed
  on by `tests/run.sh`. Everyday runs, including `--live --restart` after a QML edit, skip it
  and print a `SKIP` line. The release runs it: the `ominous-release` skill and the release
  steps in `docs/development.md` use `tests/run.sh --restart --refresh`.
- A failing live check whose command writes to stderr says why: `check` keeps the command's
  stderr and prints its last line after `FAIL`, and the reason reaches the failure list in
  `tests/results.log`. The refresh check, when it fails, writes one diagnostic line to stderr
  as its last (summon answer, card open after summon, `lastFetch` before and after,
  `lastError`, card open before it is closed).
- Docs: the usage lines in `tests/live.sh`, `tests/run.sh`, `CLAUDE.md` and
  `docs/development.md`, the notes on how long the card holds the keyboard during live checks,
  and the security map row that cites "test and preview cards across a
  refresh".

No change to the plugin: no IPC, status, config or timer change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none: tooling only, `skip_specs: true`)

## Impact

- `tests/live.sh`, `tests/run.sh`, `tests/agenda.test.mjs`; `CLAUDE.md`, `docs/development.md`,
  `.claude/skills/ominous-release/SKILL.md`.
- Everyday live runs drop from about 2.5 minutes to about 40 s. The glue that keeps a `test` or
  `preview` card open across a refresh is read by a unit test on every run, and checked live
  (for `test`) at release time.
- No user-visible change, so no `CHANGELOG.md` entry.
