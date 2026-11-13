# Tasks

## 1. Findings

- [x] 1.1 `Logic.js`: `nextDue` checks `isDueNow` before `eventKey`; `claimDue` checks `isAlertable` before reading `startMs`. Unit test in `tests/agenda.test.mjs` with `null`, a number and a string in the agenda
- [x] 1.2 `Service.qml`: `theme` refuses while either theme folder model is loading; the `dirsReady` comment and `ThemeSlot.qml`'s path comment cover a failed `mkdir`
- [x] 1.3 `docs/development.md`: the 4.5 launcher handoff and the NUL rule; the `status` row names `tests/agenda.test.mjs`
- [x] 1.4 `CHANGELOG.md` Unreleased: the malformed entry and the `theme` answer

## 2. Checks

- [x] 2.1 `mise exec -- tests/run.sh --unit` and `mise exec -- tests/run.sh --live --restart` pass

- [x] 2.2 Review findings: the shipped folder model is waited for too; a missing folder ends `Ready` (probe under Qt 6.12); proposal, design and changelog say `null` and "a theme"; the launcher paragraph names the Omarchy browser list

## 3. Review

- [x] 3.1 Code review and security review of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the specs, the design and the Security section; fix the findings or take them to the user
