# Proposal

## Why

Ominous should be ready to list on the Omarchy plugin marketplace once the repository goes
public. The marketplace builds each plugin page from the manifest, the GitHub repository, a
`preview.*` image in the repository root and a submission form. Its submission rules
(`SUBMISSION.md` in `omacom/omarchy-plugin-marketplace`) ask for a permanent plugin ID, a README
with installation and removal instructions, documented external dependencies, and no
overwriting of user configuration. Ominous misses several of these. The repository stays
private for now; this change only makes it ready.

## What Changes

- **BREAKING**: the plugin ID changes from `tuland.ominous` to `io.github.tuland.ominous`, the
  namespaced form the marketplace recommends, because an ID cannot change after listing. The
  IPC target (`omarchy-shell ominous …`), the config file and the state folder do not change.
- The README installs with `omarchy plugin add https://github.com/Tuland/ominous.git --enable`,
  explains removal (`omarchy plugin remove`), and says which files Ominous leaves behind and how
  to delete them.
- The README lists what Ominous needs: Omarchy's shell with plugins, and OmaCal with its
  `omacal` command and a synced calendar. The development tools are listed in
  `docs/development.md`.
- A `preview.png` in the repository root shows the card. It is composed from crops of the card
  on a generated background, never from a capture of a real desktop.
- `docs/development.md` gains a release checklist: version, tag, and the answers for the
  submission form (category *Productivity*, tags `quickshell` and `hyprland`).
- Tests check that the ID is the same everywhere it is written, that the README covers install
  and removal with that ID, and that the preview image is present and large enough.

## Capabilities

### New Capabilities
- `plugin-packaging`: how Ominous is identified, installed, removed and presented: plugin ID,
  install and removal instructions, files left behind, declared dependencies, and the preview
  image.

### Modified Capabilities
None.

## Impact

- `manifest.json` (`id`), the ID fallbacks in `Alert.qml` and `Service.qml`, `tests/live.sh`,
  `tests/theme-check.sh`, `README.md`, `docs/`, `CLAUDE.md`.
- The local install moves to the new ID. The old ID is disabled, the plugin folder link is
  renamed, and the new ID is enabled, all through `omarchy plugin` commands.
- New: `preview.png`, `tools/make-preview.sh`, unit tests for packaging.
- Development dependency: ImageMagick, only for regenerating the preview.
