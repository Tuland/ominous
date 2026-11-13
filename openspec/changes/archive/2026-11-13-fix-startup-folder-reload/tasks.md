# Tasks

## 1. Startup without cross-object calls

- [x] 1.1 `Service.qml`: a `dirsReady` property set by the `mkdir` process's `onExited`; `stateFile` and `themesFile` paths empty until it is true; each `ThemeSlot` gets `userDir`, and the user themes `FolderListModel` its folder, only when it is true
- [x] 1.2 `components/ThemeSlot.qml`: the user file's path is empty while `userDir` is empty; `reloadUserFile()` removed
- [x] 1.3 `components/ThemeFile.qml`: `reload()` removed (no caller)

## 2. Lint under Qt 6.12

- [x] 2.1 `Service.qml`: the four `var` declared inside a block (two `for`, one `for...in`, one `try`) become `let`/`const`; qmllint 6.12 counts them as `block-scope-var-declaration` warnings and `tools/lint.sh` failed on them since the Qt update, before this change

## 3. Checks

- [x] 3.1 `mise exec -- tests/run.sh --unit` passes
- [x] 3.2 `omarchy restart shell`, then the shell log has no `TypeError` from Ominous, `status` reports the mode and themes, and a live run (`tests/run.sh --live`) passes
- [x] 3.3 `CHANGELOG.md` Unreleased: the fix

- [x] 3.4 Review findings: `theme` refuses until `dirsReady` (a write before it would be lost); a failed `mkdir` is logged; an empty path emits no theme error (checked live: no theme error in the log on the restarts)

## 4. Review

- [x] 4.1 Code review and security review of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the specs, the design and the Security section; fix the findings or take them to the user
