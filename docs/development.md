# Development

Keep the checkout elsewhere and symlink it into `~/.config/omarchy/plugins/io.github.tuland.ominous`.
After editing QML, run `omarchy restart shell`: an overlay already summoned once keeps its old
code through `rescanPlugins`.

`mise.toml` pins `node`, `shellcheck`, `typescript`, `mypy` and `uv` (which installs
`mypy`), the tools whose version changes a result; the CI
installs the same versions from it. With [mise](https://mise.jdx.dev) active in your shell,
run `mise trust` and `mise install` once in the checkout, and every command there uses them.
Without mise, the tests still run with the system's tools, but a different version may report
what the CI does not, or the reverse.

Tools used only for development: `node` (unit tests), `python3` (scripts and the character
generator), `qmllint` (Qt 6, at `/usr/lib/qt6/bin/qmllint`), `shellcheck`, `tsc` and `mypy`
(static checks),
`grim` (screenshots), `wtype` (the `--keys` checks) and ImageMagick (`magick`, for
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
| `tools/lint.sh` | Static checks: `qmllint` on the QML, `shellcheck` on the scripts, `tsc` on the JSDoc types of `Logic.js`, `mypy` on the Python. |
| `tools/shoot-card.sh` | Photographs one theme in one phase: a synthetic card on an opaque veil, never the desktop. |
| `tools/make-preview.sh`, `preview.png` | The marketplace picture and the script that makes it (from `shoot-card.sh`). |
| `.claude/skills/ominous-theme/` | The agent skill for drawing and reviewing characters. |
| `tests/` | Unit tests by concern (`*.test.mjs`), live checks against the running shell, and `run.sh`. |
| `openspec/` | Specs and changes. |

## Checks

```bash
tests/run.sh                 # all checks: unit + art check + lint + live against the running shell
tests/run.sh --unit          # unit + art check + lint; needs no shell
tools/lint.sh                # lint only: qmllint, shellcheck, tsc, mypy
tests/run.sh --live --restart --keys   # live only, after a QML edit; --keys also types M on the card
tests/theme-check.sh <dir>   # the card under a light and a dark Omarchy theme, screenshots in <dir>;
                             # puts your Omarchy theme back and proves it
```

`tools/lint.sh` runs `qmllint` with the shell's modules on its import path (through a
temporary `qs` link to `/usr/share/omarchy/shell`). Three categories come from how the shell
and Quickshell describe their own types, so they print as info and never fail:
`missing-property`, `signal-handler-parameters`, `uncreatable-type`. Any other finding fails.
Where the shell is not installed, as on GitHub, `qmllint` is skipped with a notice and the rest
still runs. `tsc` (strict) checks a copy of `Logic.js` without its `.pragma library` line, which
is not JavaScript; `mypy --strict` checks `tools/*.py`. Both come from `mise.toml`, so a
missing one fails with a hint to run `mise install`.

Every `tests/run.sh` adds a line to `tests/results.log` (not committed): date, commit, results
and what failed. On GitHub, `.github/workflows/tests.yml` runs `tests/run.sh --unit` on every
push and pull request; the live checks need a running shell and stay local.

The live checks use your real session: the card shows up and grabs the keyboard several times.
They restore the state files and any user theme they touch, and check that `ominous.json` is
unchanged.

## Code style

Every function, component and script has a doc comment, in the styles of the Google style
guides; `tests/style.test.mjs` checks they are there. Say what it does, what it takes and what
it gives back. A one-line function with a clear name gets one summary line. Comments inside
the code are for a why that the code cannot show.

- **JavaScript** (`Logic.js`): JSDoc with types, one `@param` per parameter and `@returns`.
  Shared shapes are `@typedef`s at the top (`Config`, `AgendaEvent`, `Theme`, `Payload`, `Mode`,
  `Phase`). The types are checked by `tsc`: make them precise instead of silencing it. Untrusted
  input (a parsed file or payload) is `*`; an empty object that fills up gets a
  `/** @type {...} */` line above it.

  ```js
  /**
   * What Enter does. Without a link it can only dismiss, whatever is selected.
   *
   * @param {number} selected 0 = Join, 1 = Dismiss.
   * @param {string} url The safe join link, or "".
   * @returns {string} "join" or "dismiss".
   */
  ```
- **QML**: a `/** */` block above the root object saying what the component is, its `In:`
  (properties) and `Out:` (signals, or what it writes). Every function has typed parameters
  and return value, and a JSDoc block without types, since they are in the signature.

  ```qml
  /**
   * Opens the overlay with a payload.
   *
   * @param payload The payload object.
   * @returns Whether the shell accepted it.
   */
  function summon(payload: var): bool {
  ```
- **Bash**: a header comment after the shebang (what the script does and how to call it),
  and the Google Shell Style Guide block above each function (`Globals:`, `Arguments:`,
  `Outputs:`, `Returns:`, each only when it applies); a one-line function gets one `#` line.
  A check in `tests/live.sh` is described by its `check "..."` line.
- **Python**: Google style docstrings (`Args:`, `Returns:`) on the module and every function,
  and type hints everywhere, checked by `mypy --strict`.

## Drawing the shipped characters

`marine`, `shiba` and `boss` are drawn in `tools/draw-themes.py`. Change the art there and
rerun it; never edit their JSON by hand, because `tests/run.sh` fails when the two differ.

```bash
tools/draw-themes.py --show  # write the themes and print every frame as text, to review
tools/draw-themes.py --check # exit 1 if a theme file differs from the script
tools/shoot-card.sh shiba playful angry /tmp/shiba.png   # look at one theme in one phase
```

## Releasing

The plugin ID, `io.github.tuland.ominous`, is permanent once listed on the
[Omarchy plugin marketplace](https://plugins.omarchy.org): never change it. An agent follows
the `ominous-release` skill, which also proposes the version from what changed.

1. Every user-visible change is listed under `Unreleased` in [CHANGELOG.md](../CHANGELOG.md)
   (Keep a Changelog). Choose the version with SemVer: fix = patch, addition = minor, a break
   = major (a minor while in 0.x).
2. Rename `Unreleased` to the version and date, set the same `version` in `manifest.json`
   (`tests/packaging.test.mjs` fails if they differ), and run `tests/run.sh --restart`. If
   the card looks different, also run `tests/theme-check.sh <dir>` and `tools/make-preview.sh`,
   and look at `preview.png` before committing it.
3. Commit `Release X.Y.Z`, tag it `vX.Y.Z` (annotated), push the branch and the tag, check that
   the GitHub workflow is green, and publish a GitHub release with the changelog section.
4. The first time only, with the repository public, submit it through the marketplace's
   [plugin submission form](https://github.com/omacom/omarchy-plugin-marketplace/issues/new?template=submit-plugin.yml):
   category **Productivity**, tags **quickshell** and **hyprland**. The marketplace reads the
   name, description, version and license from `manifest.json`, and the picture from
   `preview.png`.

