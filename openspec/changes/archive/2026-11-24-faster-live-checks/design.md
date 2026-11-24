# Design

## Context

`tests/live.sh` runs every check through `check NAME COMMAND...`, which sends the command's
stdout and stderr to `/dev/null` and records only the name in `failed`; `tests/run.sh` copies
that list into `tests/results.log`. `stays_across_refresh` opens a card with `test` or
`preview`, reads `lastFetch` from `status`, waits up to 450 tries (about 90 s plus the cost of
each `status` call) for it to change, then checks that the `ominous-alert` layer is still
there. The service reads the agenda only from its 60 s `Timer` (and once at start), so the
first check waits up to a minute and the second always about a minute more.

`--restart` is not a release-only flag: `CLAUDE.md` and `docs/development.md` tell to run
`tests/run.sh --live --restart` after every QML edit. The release steps (the
`ominous-release` skill, step 3, and `docs/development.md`, "Releasing", step 3) run
`tests/run.sh --restart`.

## Goals / Non-Goals

**Goals:**
- Everyday live runs, with or without `--restart`, do not wait for an agenda refresh.
- The release run still checks once, live, that a `test` card survives a refresh.
- A failing live check whose command writes to stderr leaves its reason on screen and in
  `tests/results.log`; the refresh check always does.

**Non-Goals:**
- A way to trigger an agenda read (an IPC command or a shorter poll): it changes the plugin
  and its public IPC for a test. Left as the next step if the release run's minute matters.
- Making the refresh check stronger (an agenda the test controls behind the live shell): the
  known limit of the change `fix-0-3-1-manual-review` stays.

## Decisions

1. **A new `--refresh` flag, not `--restart`.** Tying the check to `--restart` would keep the
   minute in the runs after each QML edit, the most frequent ones. `tests/live.sh --refresh`
   runs the check; without it the script prints `SKIP a test card stays open across an agenda
   refresh (needs --refresh)`, like the existing `SKIP` for the restart hold. `tests/run.sh`
   accepts `--refresh` and passes it on, like `--restart` and `--keys`. Alternative: a
   separate script for slow checks; rejected, it would duplicate the setup, restore and
   checksum logic of `live.sh`.

2. **Keep the `test` check, drop the `preview` one.** Both rely on the command clearing the
   remembered agenda card (`shown = null` in `Service.qml`); the decision for "nothing
   remembered" (`Logic.followShown` returns `keep`) is unit tested. The `preview` check ran
   after the `test` check had already cleared `shown`, so it could not catch a `preview` that
   forgot to; it only cost a second minute.

3. **`check` keeps stderr and reports its last line.** It sends stdout to `/dev/null` and
   stderr to a temporary file; on failure it prints `FAIL <name>: <reason>` (just
   `FAIL <name>` when stderr is empty). The reason is the last line that starts like an error
   (`Error: ...`, `json.decoder.JSONDecodeError: ...`), since node and Python end their output
   with a stack or a version line, else the last non-blank line and adds the same text to `failed`, which `run.sh`
   already writes into `tests/results.log`. Passing checks print as today. The temporary file
   lives in the backup folder `$BK`, which `cleanup` already removes (and keeps, with the
   backups, only when a file could not be put back); no fixed path in `/tmp`.

4. **The refresh check, when it fails, ends with one diagnostic line on stderr**, so decision 3
   shows it as the reason: the summon answer, whether the card was open after the summon,
   `lastFetch` before and after the wait, `lastError`, and whether the card was open before it
   is closed. On success nothing is printed (`check` discards stderr then). Under `set -u` every
   variable the line uses is set before the first early return; the open state is sampled
   before `hide`; the helpers' own stderr (Python tracebacks from `jsonget`, `hide`) is
   discarded inside the check, so the diagnostic line is the last one written. It tells "the agenda was not read" (`lastFetch` unchanged, maybe with an
   error) from "the card closed" (a real alert replacing it, a key, `follow()` hiding it).
   `lastError` comes from `status`, which never prints meeting titles.

5. **A unit test reads the glue.** In `tests/agenda.test.mjs`, beside the `followShown` tests,
   the body of each of the `test` and `preview` IPC functions in `Service.qml` (from its
   `function` line to the next `function`) must contain `if (ok) root.shown = null`. It is a
   text check, like the one for `command: Logic.AGENDA_COMMAND`: it fails on a removed or
   renamed line, not on a broken QML binding, which the release's live check covers.
   Alternative: nothing between releases; rejected, the line is cheap to pin.

## Risks / Trade-offs

- [A regression in the `test`/`preview` glue lands between releases] → `Logic.followShown` and
  the `shown = null` lines are unit tested (decision 5), the glue is reviewed in each change's
  Review, and anyone can run `--refresh`.
- [The reason line is a raw stderr line from `omarchy-shell` or Python] → Only its last line
  is kept, and the commands run are the plugin's own IPC; no calendar text is printed.

## Migration Plan

None: tooling only. The release steps change to `tests/run.sh --restart --refresh`.
