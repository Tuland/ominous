# Tasks

## 1. Plugin ID

- [x] 1.1 Change the ID to `io.github.tuland.ominous` in `manifest.json`, the fallbacks in `Alert.qml` and `Service.qml`, `tests/live.sh`, `tests/theme-check.sh`, the docs and `CLAUDE.md`. Add a unit test that every `*.ominous` plugin ID in code, scripts and docs equals the manifest's. Verify the test fails on a leftover `tuland.ominous` and passes after the change
- [x] 1.2 Migrate the local install with `omarchy plugin` commands (disable old ID, rename the symlink, rescan, enable new ID). Verify `omarchy plugin list` shows only the new ID enabled and `tests/run.sh --restart --keys` passes

## 2. README for the marketplace

- [x] 2.1 Rewrite Install as `omarchy plugin add https://github.com/Tuland/ominous.git --enable`; add Requirements (Omarchy shell with plugins, OmaCal with `omacal` and a synced calendar) and Uninstall (`omarchy plugin remove io.github.tuland.ominous` plus the three leftovers and how to delete them). Extend `tests/docs.test.mjs` to check the install and remove commands use the repository URL and the manifest ID, and that the leftovers are named. Verify the tests pass and the commands are valid with `omarchy plugin` help

## 3. Preview image

- [x] 3.1 Add `tools/make-preview.sh`: summon one synthetic card per shipped theme with `dim: 1` (`classic` tense, `marine` relaxed, `shiba` tense, `boss` angry), capture the focused monitor, compose a 2x2 grid with a caption under each card on a 1920x1080 canvas with ImageMagick into `preview.png`. Verify the image shows only the cards and captions on a solid background, readable at the 720x405 thumbnail size (looked at before committing)
- [x] 3.2 Add a unit test that `preview.png` exists and is at least 1600x900 (read from the PNG header). Verify it fails without the file

## 4. Release checklist

- [x] 4.1 Add a "Releasing" section to `docs/development.md` (version, tests, preview, tag, submission form answers) and list the development tools (node, python3, grim, wtype, ImageMagick). Verify the docs tests pass
