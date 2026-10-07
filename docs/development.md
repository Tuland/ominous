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
| `components/` | QML pieces with explicit properties in and signals out: `ActionButton`, `ModeSwitch`, `LinkNotice`, `ProgressLine`, `PixelSprite`, `PhaseSprite`, `ThemeSlot`, `ThemeFile`. |
| `themes/` | The shipped themes. |
| `tools/draw-themes.py` | Draws the shipped characters and writes their JSON. |
| `tools/make-config-docs.mjs` | Writes `docs/ominous.example.jsonc` and `docs/ominous.schema.json` from the config declaration in `Logic.js` (`--check` only compares); a unit test fails when they are stale. |
| `.githooks/pre-push` | The pre-push hook: runs the unit checks before every push except a deletion. |
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

A `pre-push` hook runs `tests/run.sh --unit` (through `mise exec` when mise is installed) and
blocks a push that fails it. Git does not enable hooks by itself: run
`git config core.hooksPath .githooks` once in each checkout. `git push --no-verify` skips it on
purpose.

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

## Security

The reasons for this setup, the alternatives turned down and how to copy it to another project are
in [review-gates.md](review-gates.md); this section is the map for this plugin.

The plugin shows and acts on data it does not control: the calendar's owner can write a
meeting's title, place, calendar name and link. Reviews look at that path at three levels:

| When | What | Where it is triggered |
|---|---|---|
| Every push | Unit tests, lint, art check | `.githooks/pre-push`, and the CI |
| End of every change | Code review and security review of the change's diff, against its proposal and specs and the map below | The last task group, "Review", required by `rules.tasks` in `openspec/config.yaml` |
| Before every release | Audit of the whole code, not the diff, and an update of the map | The "Review and audit" step of the `ominous-release` skill; a finding stops the release |

### The map: untrusted data to its uses

| Source | Used for | Rule | Held by |
|---|---|---|---|
| OmaCal agenda: title, place, calendar name, link | Text on the card | Every `Text`, `Label`, `TextEdit` and `TextArea` is `Text.PlainText` (rich text can load remote images); title, place and calendar name are one cleaned line of bounded length (`Logic.cleanText`), so line breaks and direction overrides cannot reshape or reorder the card | `tests/style.test.mjs`, `tests/payload.test.mjs` |
| OmaCal agenda: link | Opening the browser | `Logic.safeUrl` (`https://` only, at most 2048 characters, with a host, no spaces, `\`, control characters; no `$` or `--private` anywhere, no `%` in the host) and an argument list, never a shell; Join is the default only for a host in `joinHosts`, and the host shown is the one opened, with every character outside printable ASCII escaped and the length capped (`Logic.linkHost`, `Logic.displayHost`, `Logic.joinTarget`); "recognized" means the service, not the meeting | `tests/hosts.test.mjs`, `tests/agenda.test.mjs` |
| OmaCal agenda: title and link | The journal and `status` | Only the event id is logged, quoted (`Logic.quoted`); `status` never prints a title | `tests/style.test.mjs` (log lines, a check of each line, not of the data flow), `tests/live.sh` (`status`) |
| OmaCal agenda: number of events | The card taking the screen and the keyboard | One card per group: when an alert fires, every unconfirmed event (not accepted, not organized) starting within the next minute counts as alerted (`Logic.claimDue`), so a flood gives at most one card a minute; a confirmed event always gets its own card and wins a tie; a start a `Date` cannot hold is not alertable | `tests/agenda.test.mjs` |
| Keys while the card opens | Joining or dismissing | Input is ignored for a second after the card opens and after every key pressed while ignored, decided at the moment of the input (`Logic.isGuarded`) | `tests/card.test.mjs`, `tests/style.test.mjs` (every input handler of `Alert.qml` asks `guardedNow()`), `tests/live.sh` (keys) |
| IPC payload (`summon`, same user) | The overlay | `Logic.normalizePayload` checks every field again with the config's ranges (`dim` 0 to 1, seconds 0 to 3600), `joinHosts` included | `tests/payload.test.mjs` |
| `ominous.json`, `state.json`, `themes.json` | Behavior and theme file names | `Logic.checkConfig` (a refused value falls back to its default and is reported in `ignoredValues`), `Logic.resolveMode`; a theme name is a slug (`Logic.isThemeName`), never a path | `tests/config.test.mjs` |
| User theme files | Colors, caption and sprite | `Logic.normalizeTheme`: colors only (at most 40 characters), captions one cleaned line of 80 characters (`Logic.cleanText`) drawn clipped, sprites at most 32x32 cells and 64 frames per phase | `tests/themes.test.mjs` |
| Long text from a calendar | The card's size | Elided or capped (title lines, captions, sprite size) | `tests/live.sh` (long title) |

The browser is started by `omarchy-launch-browser`, which runs
`systemd-run … uwsm-app -- "$browser_exec" "${@/--private/$private_flag}"`. Each layer was read
for what it could make of a link:

- `systemd-run` expands `${VAR}` in the arguments, so a `$` could change the host the browser
  opens; `uwsm-app` starts the browser through a second `systemd-run`, with the same expansion.
  `Logic.safeUrl` refuses any link with a `$`.
- The launcher's bash substitution replaces the first `--private` inside every argument, the
  link included, with the browser's private flag (`meet--private.example` would open
  `meet--incognito.example`). `Logic.safeUrl` refuses any link with `--private`.
- `uwsm-app` runs the command its daemon sends back with `eval`, but the daemon builds it with
  Python's `shlex.join`, which quotes every argument: no shell syntax in a link reaches a shell.
- The link always starts with `https://`, so it cannot be read as an option.

Invitations a minute or more apart still alert one by one, as any calendar reminder does: the
grouping bounds a flood at one card a minute, it does not stop it.

Title, place, calendar name and caption are drawn clipped to their lines, so stacked combining
marks cannot cover the buttons.

The IPC is reachable only by the same user, who already has full access, so it is not a trust
boundary; its payload is still checked, so a hand-made one behaves like a real alert.

### APIs not allowed

None of these is in the plugin, and `tests/style.test.mjs` fails when one appears in a `.qml` or
`Logic.js` file, because each runs or loads something from a string:

- `eval(`
- `createQmlObject`
- `openUrlExternally`
- `Loader`
- `Image`
- `AnimatedImage`
- `XMLHttpRequest`
- `ToolTip`
- `Qt.createComponent`
- `Qt.include`
- `FontLoader`
- `BorderImage`
- `AnimatedSprite`
- `MediaPlayer`
- `Video`
- `SoundEffect`

`ToolTip` is Qt's own, whose text can be read as rich text: use the shell's `PanelToolTip`, which shows plain text.
To use one, argue it in this section first (what data reaches it and why that is safe), and
change the list here and in the test in the same change.

### Auditing before a release

Walk the map over the whole code, not the diff. For every place where calendar, IPC, config,
state or theme data enters (`Service.qml`, `Alert.qml`, `Logic.js`), follow it to every use:
a `Text`, a process or `execDetached`, a file path, a log line, `status`. A use not in the map
is a finding, and so is a line in the map that no longer holds. Check that the browser is
started with an argument list and that nothing built from the data reaches a shell. Run the
tests that hold each rule, then update the map. A finding that is not fixed stops the release.

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
2. Audit the whole code as "Auditing before a release" above describes; a finding stops the
   release. Check that every new `ominous.json` key is in the changelog.
3. Rename `Unreleased` to the version and date, set the same `version` in `manifest.json`
   (`tests/packaging.test.mjs` fails if they differ), and run `tests/run.sh --restart`. If
   the card looks different, also run `tests/theme-check.sh <dir>` and `tools/make-preview.sh`,
   and look at `preview.png` before committing it.
4. Commit `Release X.Y.Z`, tag it `vX.Y.Z` (annotated), push the branch and the tag, check that
   the GitHub workflow is green, and publish a GitHub release with the changelog section.
5. Tell the marketplace. While the submission is still in review, edit its issue so the bots
   validate the new commit, and answer the maintainer with what changed. Once the plugin is
   listed, use the marketplace's "Plugin verification" form, "Verify and publish a newer
   upstream commit", with the release commit; until it is approved the site shows the new
   version as unverified.
6. The first time only, with the repository public, submit it through the marketplace's
   [plugin submission form](https://github.com/omacom/omarchy-plugin-marketplace/issues/new?template=submit-plugin.yml):
   category **Productivity**, tags **quickshell** and **hyprland**. The marketplace reads the
   name, description, version and license from `manifest.json`, and the picture from
   `preview.png`.

