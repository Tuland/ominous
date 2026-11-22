# Proposal

## Why

A manual review of `97ab746` withheld approval over two developer tools that touch the user's
real session:

- `tests/live.sh` backs up the user's state files and theme with unchecked copies, and its
  cleanup removes the originals before putting the backups back. A failed copy (disk full,
  permissions) loses the original.
- `tools/shoot-card.sh` never checks that the synthetic card is on screen. A failed summon or a
  focus change leaves desktop content in a capture that can still pass the centring check.

## What Changes

- `tests/live.sh` copies each file through a `backup` function that stops the run, before
  anything is changed, when a copy fails or the file is a symlink (the checks would write
  through it into its target). Its cleanup copies each backup over what the checks left
  instead of removing the originals first, recreates a folder the checks removed, and keeps
  the backup folder, printing its path, when a file cannot be put back.
- `tools/shoot-card.sh` captures only when Hyprland reports the `ominous-alert` layer on the
  monitor it is about to capture; otherwise it hides the card and counts the try as failed.

## Capabilities

### New Capabilities

### Modified Capabilities

None: tooling only (`skip_specs: true`).

## Impact

`tests/live.sh` and `tools/shoot-card.sh`. No change to the plugin's code, config, commands or
packaging, and nothing for the CHANGELOG.
