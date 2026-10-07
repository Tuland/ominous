# Tasks

## 1. Fix

- [x] 1.1 Set `textFormat: Text.PlainText` on every `Text` in `Alert.qml` and `components/`, the calendar line (`headline`) first. Verify `tools/lint.sh` passes
- [x] 1.2 Add a test in `tests/style.test.mjs`: every `Text {` block in the QML sets `textFormat: Text.PlainText`. Verify it fails on the code before 1.1 and passes after
- [x] 1.3 Live: summon a card whose calendar is `<img src="https://example.com/x.png">Team` and confirm the line shows the characters literally (picture with `tools/shoot-card.sh`-style synthetic payload). Verify `tests/run.sh --restart` passes
- [x] 1.4 Fix `tests/live.sh`: the user-theme checks break `marine.json` but assumed playful uses marine; with a saved theme choice (e.g. boss) they failed. Forget `themes.json` before them (it is restored on exit). Verify the live suite passes with `boss` chosen and the choice is back afterwards

## 2. Release

- [x] 2.1 `CHANGELOG.md`: a Security entry under `Unreleased`. Verify the changelog test passes
