# Design

## Context

See `proposal.md` for the motivation. The marketplace rules come from `SUBMISSION.md` in
`omacom/omarchy-plugin-marketplace`. The plugin page is generated from `catalog.json`, which
combines manifest fields, GitHub data, the submission form and an image derived from a
`preview.*` file in the repository root. The local install is a symlink
`~/.config/omarchy/plugins/tuland.ominous` pointing to the checkout. The enabled ID is recorded
by the shell in `~/.config/omarchy/shell.json`.

## Goals / Non-Goals

**Goals:**
- One ID, written the same way everywhere, and checked by a test.
- A README that a marketplace reviewer can check against the submission checklist.
- A reproducible preview image that cannot leak anything from the developer's desktop.

**Non-Goals:**
- Making the repository public, tagging a release on GitHub, or submitting the form. These are
  the owner's actions, to be taken later.
- Migrating other users' installs: there are none yet.

## Decisions

### The new ID

The new ID is `io.github.tuland.ominous`, the form the marketplace recommends. The IPC target
stays `ominous`, so the commands in the docs keep working. The paths
`~/.config/omarchy/ominous.json` and `~/.local/state/ominous/` do not depend on the ID and stay
as they are. A unit test collects every `*.ominous` plugin ID written in the code, the scripts
and the docs, and compares each with `manifest.json`.

Local migration, using only `omarchy plugin` commands so the shell keeps its own records:
1. `omarchy plugin disable tuland.ominous`.
2. Rename the symlink to `io.github.tuland.ominous`.
3. `omarchy-shell shell rescanPlugins`.
4. `omarchy plugin enable io.github.tuland.ominous`.

The steps are checked afterwards with `omarchy plugin list` and the live suite.

- *Alternative: keep `tuland.ominous`.* Rejected. It is valid, but an ID can never change after
  listing, and the namespaced form avoids clashes.

### Preview image

`tools/make-preview.sh` summons the card directly with `omarchy-shell shell summon <id>
<payload>`. The payload is synthetic: a made-up meeting, the theme files read from `themes/`,
and `dim: 1`. With full dimming the veil behind the card is opaque, the theme's background
color, so a capture of the focused monitor contains the card and nothing of the desktop. The
script captures one card per shipped theme and composes a 2x2 grid with ImageMagick on a
1920x1080 canvas of the same color. The grid is `classic` (professional, tense), `marine`
(relaxed), `shiba` (tense) and `boss` (angry), so together they show every phase. Each card has
a caption naming the theme and the phase, in the shell's monospace font and the theme's
foreground color. The card's colors are those of the Omarchy theme active when the script runs.

- *Alternative: crop around the card on a normal capture.* Rejected. The edges show the desktop
  behind the card, as the manual screenshots during development did.
- *Alternative: render offscreen in QML.* Rejected: much more code for the same picture.

### Release checklist

`docs/development.md` lists the steps: bump `version`, run `tests/run.sh`, regenerate the
preview if the card's look changed, tag `vX.Y.Z`, and the submission form answers (category
*Productivity*; tags `quickshell`, `hyprland`). Publishing stays manual.

## Risks / Trade-offs

- [Something else drawn on the overlay layer, such as a notification, lands in the capture] →
  The script hides the card between shots and prints the files it wrote; the image is reviewed
  before it is committed.
- [The renamed install stops working until the new ID is enabled] → The migration is four
  commands, run once, and checked with the live suite.
- [The preview shows one Omarchy theme only] → That is acceptable for a marketplace card, and
  `tests/theme-check.sh` covers the others.

## Migration Plan

Run the four local steps above after the code change, then `tests/run.sh --restart --keys`.
Rollback: revert the commit and run the same steps with the IDs swapped.
