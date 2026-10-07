# Tasks

## 1. Alerts

- [x] 1.1 `Logic.claimDue` marks every other alertable event already in its window; `isAlertable` requires a finite start below `8.64e15`. Unit tests: fifty same-minute events give one alert in 150 s; a 10:30 meeting still alerts after a 10:00 one; `startMs: 1e300` is not alertable and `statusSnapshot` answers
- [x] 1.2 `docs/usage.md` ("Which meetings alert") and the Security map: one card per group, and the limit (invitations spread over time)

## 2. Links and input

- [x] 2.1 `Logic.safeUrl` refuses a link containing `--private`, with a comment citing the launcher's substitution. Unit test with `https://meet--private.example.com/x`
- [x] 2.2 `Alert.qml`: the key handler and the clicks decide with `Logic.isGuarded(..., Date.now(), ...)`; the `guarded` property only drives the look
- [x] 2.3 `unknownLinkTip` says "characters outside plain ASCII"; tests and docs updated

## 3. Config

- [x] 3.1 `checkConfig` reports a nested `themes` key with its name escaped. Unit test: `{"themes": {"a\nb": "x"}, "leadSeconds": 30}` gives one-line `ignoredValues` and a `config` output that reads back with `leadSeconds` 30
- [x] 3.2 `Service.qml`: an `ominous.json` that exists but cannot be read sets `configError`; a missing one does not. Checked live with a file the user cannot read, then restored
- [x] 3.3 `CONFIG_FIELDS`: seconds are `number`, `calendars` items `string` or `number`; regenerate the example and the schema with `tools/make-config-docs.mjs`

## 4. Themes and payload

- [x] 4.1 `normalizeTheme` cleans captions with `cleanText(..., 80)`; the caption `Text` in `Alert.qml` gets `clip: true`; `normalizeSprite` refuses more than 64 frames in a phase. Unit tests for both
- [x] 4.2 `normalizePayload` applies the config's ranges to `dim`, `leadSeconds` and `tenseSeconds`. Unit test

## 5. Tooling and docs

- [x] 5.1 `tests/style.test.mjs`: the list of APIs not allowed gains `Qt.createComponent`, `Qt.include`, `FontLoader`, `BorderImage`, `AnimatedSprite`, `MediaPlayer`, `Video`, `SoundEffect`, with `docs/development.md`; a test that no `console.log` in `Service.qml` prints a title or a place
- [x] 5.2 `tests/theme-check.sh` stops before its trap when the copy of the current theme fails
- [x] 5.3 `.github/workflows/tests.yml` header names lint and the art check; the release skill prefixes `tests/run.sh` with `mise exec --`
- [x] 5.4 `docs/development.md` Security map: the uwsm chain (second `systemd-run`, `eval` of a `shlex.join`), the `--private` rewrite, the alert volume, the payload ranges, the theme rules (captions, frames), and "Held by" for the log lines
- [x] 5.5 `CHANGELOG.md` Unreleased: the `dim: null` entry corrected; one card per group, `--private`, unreadable file and the other user-visible items added. `mise exec -- tests/run.sh --unit` and `mise exec -- tests/run.sh --live --restart --keys` pass
- [x] 5.6 Findings of the change's review (code and security, separate contexts), each verified: grouping by open window was beaten by starts 5 s apart and let an invitation or a late meeting swallow a real one, so it groups by start (unconfirmed events starting within 60 s) and a confirmed event always gets its own card and wins a tie (user's decision); a style test that every input handler of `Alert.qml` asks `guardedNow()`; the map says `$` and `--private` anywhere and calls the log test what it is; design and proposal match the code

## 6. Review

- [x] 6.1 Code review and security review of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the specs, the design and the Security section; fix the findings or take them to the user
