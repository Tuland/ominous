# Development

Keep the checkout elsewhere and symlink it into `~/.config/omarchy/plugins/io.github.tuland.ominous`.
After editing QML, run `omarchy restart shell`: an overlay already summoned once keeps its old
code through `rescanPlugins`.

Tools used only for development: `node` (unit tests), `python3` (scripts and the character
generator), `grim` (screenshots), `wtype` (the `--keys` checks) and ImageMagick (`magick`, for
`preview.png`).

## Layout

| Path | What it is |
|---|---|
| `Logic.js` | Every decision, as pure functions with no QML types, indexed by section at the top. Anything with a decision in it goes here, with a unit test. |
| `Service.qml` | Polls OmaCal, summons the card, watches the config, state and theme files, answers the `ominous` IPC target. |
| `Alert.qml` | The card: window, layout, keys, the mode's state file. |
| `components/` | QML pieces with explicit properties in and signals out: `ActionButton`, `ModeSwitch`, `ProgressLine`, `PixelSprite`, `PhaseSprite`, `ThemeSlot`, `ThemeFile`. |
| `themes/` | The shipped themes. |
| `tools/draw-themes.py` | Draws the shipped characters and writes their JSON. |
| `tools/make-preview.sh`, `preview.png` | The marketplace picture and the script that makes it. |
| `tests/` | Unit tests by concern (`*.test.mjs`), live checks against the running shell, and `run.sh`. |
| `openspec/` | Specs and changes. |

## Checks

```bash
tests/run.sh                 # all checks: unit + art check + live against the running shell
tests/run.sh --unit          # unit + art check only; needs no shell
tests/run.sh --live --restart --keys   # live only, after a QML edit; --keys also types M on the card
tests/theme-check.sh <dir>   # the card under a light and a dark Omarchy theme, screenshots in <dir>;
                             # puts your Omarchy theme back and proves it
```

Every `tests/run.sh` adds a line to `tests/results.log` (not committed): date, commit, results
and what failed.

The live checks use your real session: the card shows up and grabs the keyboard several times.
They restore the state files and any user theme they touch, and check that `ominous.json` is
unchanged.

## Drawing the shipped characters

`marine`, `shiba` and `boss` are drawn in `tools/draw-themes.py`. Change the art there and
rerun it; never edit their JSON by hand, because `tests/run.sh` fails when the two differ.

```bash
tools/draw-themes.py --show  # write the themes and print every frame as text, to review
tools/draw-themes.py --check # exit 1 if a theme file differs from the script
```

## Releasing

The plugin ID, `io.github.tuland.ominous`, is permanent once listed on the
[Omarchy plugin marketplace](https://plugins.omarchy.org): never change it.

1. Bump `version` in `manifest.json`.
2. Run `tests/run.sh --restart --keys` and `tests/theme-check.sh <dir>`.
3. If the card looks different, run `tools/make-preview.sh` and look at `preview.png` before
   committing it. It summons synthetic cards with an opaque veil, so it never captures the
   desktop.
4. Tag the commit `vX.Y.Z`, push, and publish a GitHub release for the tag.
5. The first time only, with the repository public, submit it through the marketplace's
   [plugin submission form](https://github.com/omacom/omarchy-plugin-marketplace/issues/new?template=submit-plugin.yml):
   category **Productivity**, tags **quickshell** and **hyprland**. The marketplace reads the
   name, description, version and license from `manifest.json`, and the picture from
   `preview.png`.

