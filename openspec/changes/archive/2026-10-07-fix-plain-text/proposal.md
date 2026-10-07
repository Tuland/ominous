# Proposal

## Why

A marketplace reviewer found (submission issue omacom/omarchy-plugin-marketplace#10156) that the card's top line shows the calendar name in a `Text`
with Qt's default `textFormat`, `AutoText`: a string that looks like markup is rendered as rich
text. The owner of a shared calendar controls its name, so `<img src="https://...">` in it
makes the card fetch an external image when an alert opens, telling a third party that the
user has a meeting now. The title, location and caption were already plain text; this line was
missed, and nothing checked for it.

## What Changes

- Every `Text` in the plugin's QML sets `textFormat: Text.PlainText`, the calendar line
  included. Strings shown on the card are never parsed as markup.
- A unit test fails when a `Text` in the QML has no `textFormat: Text.PlainText`.
- `tests/live.sh` no longer assumes the playful theme is marine: a saved theme choice made the
  user-theme checks fail.
- `CHANGELOG.md`: a Security entry under `Unreleased`, to release as 0.2.1.

## Capabilities

### New Capabilities
- `untrusted-input`: how the plugin treats data it does not control (calendar fields, payloads,
  theme files) when it shows them.

### Modified Capabilities
None.

## Impact

Changed: `Alert.qml`, `components/ActionButton.qml`, `components/ModeSwitch.qml`,
`tests/style.test.mjs`, `tests/live.sh`, `CHANGELOG.md`. The card looks the same for
every ordinary calendar name.
