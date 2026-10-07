# Tasks

## 1. The shown host

- [x] 1.1 `JOIN_SERVICES` (host, name) as the one table, `DEFAULT_JOIN_HOSTS` derived from it; RingCentral as `v.ringcentral.com`, `meetings.ringcentral.com` among the optional hosts. Verify the existing host tests pass, plus: `https://v.ringcentral.com/join/1` recognized as "RingCentral", `https://community.ringcentral.com/x` not
- [x] 1.2 `Logic.displayHost` (every unit outside `!`..`~` as `\uXXXX`) and `shortHost(text, max)`; `joinTarget` returns `recognized` and a label escaped then cut at 32; `unknownLinkTip` escaped then cut at 64, "to make Join the default for it", the non-ASCII sentence on any escape. Unit tests: U+202E, U+200B, U+0435, U+3002 hosts shown escaped and not recognized; a 2000-character host gives a first line of at most 64 characters after "…"; a recognized host still shows its service name
- [x] 1.3 `Alert.qml` uses `recognized`; its `joinHosts` comment names `Logic.hostList`. `LinkNotice` gets `active` (bound to `root.opened`) and clears `pinned` when it turns false. Ask the user to check by hand, before and after: click the "?", dismiss, then `omarchy-shell shell summon` another unknown-link card; it must open without the tooltip. Photograph the RTL and the 2000-character cases with `tools/shoot-card.sh` and look at them

## 2. Config

- [x] 2.1 `parseConfig`: a text that is only white space after `stripJsonc` parses as `{}`. Unit tests: only a comment, only blank lines, a comment and blank lines with a BOM
- [x] 2.2 `Logic.quoted` (JSON text, units outside printable ASCII escaped, cut at 40 with "…"); `formatConfig` and `Service.loadConfig` print unknown keys with it. Unit tests: a key with `\n`, U+2028 and U+202E stays on one comment line and the output reads back to the same config
- [x] 2.3 `checkConfig(raw)` returning `{ config, ignored }`, one entry per value that falls back to its default (each key, each `themes` mode, each bad `joinHosts` and empty `calendars` entry); `normalizeConfig` returns its `config`; `parseConfig` returns `ignored`. Unit tests: one ignored value per key; normalized values (90.4, upper-case calendar, `"Zoom.US"`) not reported; a clean file reports none
- [x] 2.4 `Service.qml`: `ignoredValues` kept, logged with `quoted`, in `status`; `formatConfig` lists them in its header. Unit test for the header; `tests/live.sh` checks that `status` has `ignoredValues` and `unknownKeys` as lists. Verify `mise exec -- tests/run.sh --restart` passes
- [x] 2.5 Wording: `joinHosts` description in `CONFIG_FIELDS` ("Meeting hosts where Join is selected first (subdomains too); your list replaces this one. Recognized means the service, not the meeting."); regenerate the example and the schema with `tools/make-config-docs.mjs`

## 3. Tests that keep it so

- [x] 3.1 `tests/style.test.mjs`: the plain-text check covers `Label`, `TextEdit` and `TextArea`; `ToolTip` (whole word) joins the forbidden APIs, with `docs/development.md` updated to match. Verify each new rule fails on a temporary bad line (reverted afterwards)
- [x] 3.2 Index test: every `function` in `Logic.js` appears in the index at its top (add `hostIn`, `inlineJson` and the new functions). Components test: every `components/*.qml` is named in `docs/development.md` and `CLAUDE.md` (add `LinkNotice`). Verify both fail when a name is removed (reverted afterwards)

## 4. Review process

- [x] 4.1 `openspec/config.yaml` `rules.tasks`: the Review group is done in a context separate from the one that wrote the change (`/code-review`, `/security-review` or a reviewer agent). Verify `openspec instructions tasks` returns the new text
- [x] 4.2 `.githooks/pre-push`: when `git status --porcelain` is not empty, run the checks anyway and print that the working tree differs from what is pushed. Verify with an untracked file and with a clean tree
- [x] 4.3 Read the marketplace's `scripts/security-baseline.mjs` (clone `omacom/omarchy-plugin-marketplace` into the scratchpad) and find whether it can scan a local checkout. `ominous-release` skill, step 2.5 "Review and audit": a code review of `git diff <last tag>..HEAD` in a separate context, the security audit, then that scanner on the local checkout if it can, otherwise a note that it runs after the push. Verify the skill tests pass
- [x] 4.4 `docs/review-gates.md`, portable: the three levels, each decision with the alternatives turned down and its sources (pre-push and not pre-commit; tests on the working tree with a warning, not stash or worktree; no hook manager; `core.hooksPath` per checkout; review in a separate context, with the evidence; no push rules inside agents), how to copy it to another project. `docs/development.md` Security section links to it. Verify the docs tests pass (links)

## 5. Docs and changelog

- [x] 5.1 `docs/configuration.md`: "recognized" wording, the limit of recognition paragraph, RingCentral, `ignoredValues`, comment-only files. `docs/usage.md`: wording of the "?". `docs/development.md` Security map: the escaped host, `ignoredValues`. `CLAUDE.md`: `LinkNotice`, "recognized". Verify the docs tests pass
- [x] 5.2 `CHANGELOG.md` Unreleased, amended rather than added to (none of this shipped): the `joinHosts` and "?" entries say "recognized" and the narrower RingCentral default; the `status` entry gains `ignoredValues`; the comments entry says a file of comments is fine. Verify `mise exec -- tests/run.sh --unit` passes

## 6. Findings of the separate-context review

- [x] 6.1 Fixes for what the first review found, each with a test: spec scenarios written with escapes instead of raw characters; the optional-values requirement says "recognized"; a file that is not an object, and `themes` as a list, are ignored values; entries of `ignoredValues` are joined with `; `
- [x] 6.2 Fixes for what the security review found, each with a test and a spec requirement: a link with no host is no link (`safeUrl`); only a plain host name can be recognized; title, place and calendar name are one cleaned, bounded line (`cleanText`) and the two lines of the card that lacked it get `maximumLineCount: 1`; a `calendars` entry that is not text cannot throw
- [x] 6.3 Fixes for the second review: calendar text also loses direction marks and zero-width spaces (joiners stay); a link with a control character is no link; the log quotes the event id; `quoted` never cuts inside an escape
- [x] 6.4 The tooltip stays inside the card (user's finding on the live card): lines of at most 65 characters with the host on its own line, and `LinkNotice` moves the tooltip to stay within the card (`bounds`). Photographed with a normal, a 2000-character and a non-Latin host
- [x] 6.5 Fixes for the third review (code and security, separate contexts), each with a test or a photo: links with `$` are refused (systemd expands `${VAR}` in the browser's arguments), and so are links with C1 control characters, a `%` escape in the host or more than 2048 characters; trailing dots are removed without a quadratic regex; `shortHost` and `quoted` never cut an escape in half; misspelt modes inside `themes` and a file holding `null` are ignored values; `statusSnapshot` copes with any number of events; calendar text is clipped to its lines; the tooltip's position follows the "?" and a new payload unpins it; the plain-text test finds elements anywhere on a line and counts only their own `textFormat`; the hook also warns when a pushed ref is not the checked-out commit; the release skill says what `/code-review` and `/security-review` cover; docs, changelog and specs updated
- [x] 6.6 The input guard waits for a pause (security finding: a space typed just after the first second activated the card): a key swallowed by the guard starts it again (`Logic.isGuarded`), with a unit test, a live check that typing keeps the card open, the spec requirement, `docs/usage.md` and the changelog

## 7. Review

- [x] 7.1 Second code and security review, after those fixes, of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the specs, the design and the Security section; fix the findings or take them to the user
