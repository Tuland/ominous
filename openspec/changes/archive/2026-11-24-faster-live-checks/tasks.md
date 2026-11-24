# Tasks

## 1. Tools

- [x] 1.1 `tests/live.sh`: `check` sends stdout to `/dev/null` and stderr to a file inside `$BK` (removed with it by `cleanup`); on failure it prints `FAIL <name>: <reason>`, the reason being the last stderr line that starts like an error, else the last non-blank one (or `FAIL <name>` with no stderr) and adds the same text to `failed`; passing checks print as before (design decision 3). Function header updated
- [x] 1.2 `tests/live.sh`: a `--refresh` flag (`REFRESH=0` set beside `RESTART` and `KEYS`, for `set -u`) in the argument loop, the usage message and the header; only the `test` refresh check remains, run when `--refresh` is given, else `SKIP a test card stays open across an agenda refresh (needs --refresh)`; the `preview` check is removed (design decisions 1, 2)
- [x] 1.3 `tests/live.sh`: `stays_across_refresh`, on every failing path, writes as its last stderr line the summon answer, whether the card was open after the summon, `lastFetch` before and after, `lastError`, and whether the card was open before `hide`; the variables are set before the first early return (`set -u`), the open state is sampled before `hide`, and the helpers' stderr is discarded inside the function (design decision 4)
- [x] 1.4 `tests/agenda.test.mjs`: a test that reads `Service.qml` and checks that the bodies of the `test` and `preview` IPC functions (each from its `function` line to the next `function`) contain `if (ok) root.shown = null` (design decision 5); it fails when either line is removed (checked by running it against a scratch copy with the line removed). Verify: `mise exec -- tests/run.sh --unit` passes
- [x] 1.5 `tests/run.sh`: accepts `--refresh` and passes it on to `tests/live.sh`; header and usage message list it

## 2. Docs

- [x] 2.1 `CLAUDE.md` ("Checking a change") and `docs/development.md` (the checks block and "Releasing", step 3): `--refresh` and what it adds; release runs `tests/run.sh --restart --refresh`. `.claude/skills/ominous-release/SKILL.md`, step 3, the same. The security map row "OmaCal agenda: a meeting changed while its card is open" cites `tests/live.sh --refresh` (a test card across a refresh). The notes on the real session (`CLAUDE.md` after the commands block, `docs/development.md` "The live checks use your real session") say that the card holds the keyboard for about a minute only with `--refresh`. Verify: `mise exec -- tests/run.sh --unit` passes (`tests/style.test.mjs`, shellcheck); `tests/docs.test.mjs` does not read the security map or the command blocks, so those sentences are checked by reading them and in the Review

## 3. Checks

- [x] 3.1 `mise exec -- tests/run.sh --live` passes in well under a minute, prints the `SKIP` line and no refresh wait; `holdSeconds` 0 afterwards
- [x] 3.2 `mise exec -- tests/run.sh --live --restart --refresh` passes with the refresh check run (tell the user first: the card holds the keyboard for about a minute); `holdSeconds` 0 afterwards
- [x] 3.3 A failure shows its reason, without sourcing `tests/live.sh` (it backs up files, calls the IPC and exits): a scratch script with a copy of `check` alone, run on a command that writes a line to stderr and fails, prints `FAIL <name>: <line>`; and a failing refresh check (in a scratch copy of `live.sh` whose wait is cut to a few tries, run with `--refresh`) prints the diagnostic line with every field, and its reason reaches the last line of `tests/results.log` when run through a scratch copy of `run.sh` pointing at it

## 4. Review

- [x] 4.1 Code review and security review of this change's diff, in a separate context (a fresh Cursor reviewer through herdr, with a neutral brief: read-only, no network, no `gh` or `curl`, what to read and the answer format only; its commands checked in the transcript afterwards), against the proposal, the design and the Security section of `docs/development.md`; fix the findings or take them to the user

## Workflow follow-up

- Commit on `staging` when the user asks; nothing on `main` while #14910 waits. Tooling only: no `CHANGELOG.md` entry and no release of its own.
