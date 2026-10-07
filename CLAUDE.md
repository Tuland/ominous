# Ominous — agent notes

An Omarchy shell plugin (`io.github.tuland.ominous`, kinds `service` + `overlay`). See `README.md` and
`docs/` for what it does, `docs/development.md` for the layout and checks, `openspec/` for specs
and changes. User-facing changes update the matching page in `docs/` (`tests/docs.test.mjs`
checks config keys, IPC commands, themes and links).

## Layout

The structure follows the shell's own plugins (`/usr/share/omarchy/shell/plugins/`, read only —
never edit it): entry QML files at the top, one pure logic file, reusable pieces in `components/`.

- `Service.qml` — polls `omacal agenda --json` every 60 s, checks the alert window every 5 s,
  summons the overlay through the injected `shell.summon(id, payloadJson)`; IPC target
  `ominous` (`test`, `preview`, `status`, `config`, `themes`, `theme`). The mode lives in
  `~/.local/state/ominous/state.json` (written only by the overlay), the `theme` choice in
  `themes.json` beside it (written only by the service); `ominous.json` is never written (`config` only prints it).
- `Alert.qml` — the overlay: `open(payloadJson)` / `close()`, a `PanelWindow` on
  `WlrLayer.Overlay`, theme tokens from `qs.Commons` (`Color`, `Style`, `Util`, `Border`).
- `Logic.js` — every decision, as pure functions with no QML types, so node can run them; an
  index at its top lists them by section. Anything with a decision in it goes here, with a unit
  test; the QML files stay glue.
- `components/` — QML pieces with explicit properties in and signals out, never reaching into the
  file that uses them: `ActionButton`, `ModeSwitch`, `ProgressLine`, `PixelSprite`, `PhaseSprite`
  (frames and the angry jolt) for the card; `ThemeSlot` / `ThemeFile` (one mode's theme, watched)
  for the service.
- `themes/` — the shipped themes. `marine`, `shiba` and `boss` are drawn by
  `tools/draw-themes.py`: change the art there and rerun it, never the JSON by hand
  (`tests/run.sh` fails if they differ).
- `tests/` — `*.test.mjs` unit tests by concern sharing `helpers.mjs`, plus `live.sh` and
  `theme-check.sh` against the running shell, and `run.sh` to run them all.

## Rules

- Everything in English: code, comments, UI strings, docs, commit messages.
- No personal or employer data anywhere: no real emails, calendar names, meeting links, home
  paths. Use placeholders such as `work@example.com`.
- Calendar data is untrusted input: only `https://` URLs are ever opened (`Logic.safeUrl`).
- The status IPC never prints meeting titles.
- Theme art is original: no traced sprites, no third-party names or trademarks in theme names.
- The plugin ID `io.github.tuland.ominous` is permanent (marketplace rule): never change it.
  `tests/packaging.test.mjs` checks every place it is written.
- `preview.png` comes only from `tools/make-preview.sh` (synthetic cards, no desktop).
- Every change goes through OpenSpec (`openspec new change`, then the artifacts the schema asks
  for, checked with `openspec instructions`). Behavior, config, commands and packaging get spec
  deltas; tooling, tests, CI and agent skills set `skip_specs: true` in `.openspec.yaml`.
- After archiving a change, add its user-visible items under `## [Unreleased]` in
  `CHANGELOG.md`, and say whether a release is worth it now and which version. Releases follow
  the `ominous-release` skill (`.claude/skills/ominous-release/`); the version lives only in
  `manifest.json`.
- Every function, component and script has a doc comment (JSDoc in `Logic.js` and QML, the
  Google Shell Style Guide in scripts, Google docstrings in Python; see "Code style" in
  `docs/development.md`). QML functions are typed, and so are the JSDoc in `Logic.js` and the
  Python hints. `tests/style.test.mjs` checks the comments, `tools/lint.sh` (`qmllint`,
  `shellcheck`, `tsc`, `mypy`) the rest.
- Commits and pushes wait for the user to ask.

## Checking a change

`mise.toml` pins the development tools (`node`, `shellcheck`, `typescript`, `mypy`, `uv`) to the
CI's versions. A non-interactive shell does not
run mise's hook, so prefix the checks with `mise exec --` (e.g. `mise exec -- tests/run.sh --unit`).

```bash
tests/run.sh                     # everything: unit + art check + lint + live, one history line in tests/results.log
tests/run.sh --unit              # unit + art check + lint, no shell needed
tools/lint.sh                    # qmllint (QML), shellcheck (scripts), tsc (Logic.js types), mypy (Python)
tests/run.sh --live --restart    # live only, after a QML edit (add --keys to inject M keystrokes)
tests/theme-check.sh <dir>       # card under a light and a dark Omarchy theme, screenshots in <dir>; restores the theme and proves it
omarchy restart shell            # QML changes: an already-summoned overlay keeps old code
omarchy-shell ominous test       # synthetic alert now
omarchy-shell ominous preview "angry playful"   # hold one phase/mode; add a long title to test fit
omarchy-shell shell hide io.github.tuland.ominous         # close it again (the card grabs the keyboard)
omarchy-shell ominous status     # config, counts, next start, last error
```

Live checks and screenshots touch the user's real session: the card grabs the keyboard, so
never inject keys unless the overlay is open; restore any state file or theme you change. To
look at the card, use `tools/shoot-card.sh` (a synthetic card on an opaque veil), never a raw
screenshot of the screen. For theme and character work, follow the `ominous-theme` skill
(`.claude/skills/ominous-theme/`).
