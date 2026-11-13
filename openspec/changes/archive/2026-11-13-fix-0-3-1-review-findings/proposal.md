# Proposal

## Why

The 0.3.1 release review (code, `git diff v0.3.0..HEAD`) and the whole-code security audit,
each run in a context separate from the author, found no Critical, High or Medium fault, but
the release skill stops on any finding not fixed. The audit found that one agenda entry that is
is `null` makes `claimDue` throw on every tick, so no alert shows until
OmaCal's output changes. The review found that `theme` can call a theme "not found" while
the theme folders are still being listed after start, and comments that say more than the
code does. The audit also found the security map out of date with the Omarchy 4.5 launcher.

## What Changes

- `Logic.nextDue` and `Logic.claimDue` check that an entry is alertable (which refuses
  `null` and any non-object) before reading its id or start, so a malformed entry is skipped.
- The `theme` command answers "not ready yet, try again" also while the theme folders are being
  listed.
- Comments on `dirsReady` and the user theme path say what happens when `mkdir` fails.
- `docs/development.md`: the launcher's 4.5 handoff path (NUL-separated arguments to a running
  Chromium-family browser) and why `safeUrl`'s rules still hold for it; the `status` row names
  the unit test that holds it.
- `CHANGELOG.md` Unreleased: both user-visible items.

## Capabilities

### New Capabilities

### Modified Capabilities

- `untrusted-input`: a requirement that a malformed agenda entry is skipped.

## Impact

`Logic.js`, `Service.qml`, `components/ThemeSlot.qml`, `tests/agenda.test.mjs`,
`docs/development.md`, `CHANGELOG.md`. No config, command or packaging change.
