# Design

## Context

See `proposal.md` for the motivation. `qmllint` lives in `/usr/lib/qt6/bin/` and is not on the
PATH. Ominous imports the shell's modules as `qs.Commons` and `qs.Ui`; on disk they are
`/usr/share/omarchy/shell/Commons` and `/usr/share/omarchy/shell/Ui`, with no `qs` folder
above them, so `qmllint` cannot resolve them by default. Quickshell's own modules are under
`/usr/lib/qt6/qml/Quickshell`. The shipped Omarchy plugins are not lint-clean either: 12 of
their files give more than 600 findings, mostly the same categories that the shell's types
cause in ours.

## Goals / Non-Goals

**Goals:**
- Zero findings of ours from `qmllint` and `shellcheck`, enforced by `tests/run.sh --unit`.
- Every function and component documented in one family of styles, enforced by a test.
- Types on every QML function.

**Non-Goals:**
- Type-checking `Logic.js` with `tsc --checkJs`: a separate change, which the JSDoc types make
  possible later.
- `mypy` for `tools/draw-themes.py`, and formatting tools (`qmlformat`, `shfmt`).
- Silencing the shell's own findings by changing the shell: it is read-only.

## Decisions

### Import path through a temporary `qs` link

`tools/lint.sh` makes a temporary folder with a `qs` link to `/usr/share/omarchy/shell` and
passes it with `-I`, plus `-I /usr/lib/qt6/qml`. Nothing is written in the repository or in the
user's config.

- *Alternative: a `.qmllint.ini` in the repository.* Rejected: it would hold machine paths.
  Levels are given on the command line instead.

### Shell-caused categories as info, not disabled

`missing-property` (the shell declares `Style.font` and `Color.notifications` as `QtObject`, so
their fields are invisible to the linter), `signal-handler-parameters` (Quickshell's
`Process.exited` uses a type its qmltypes do not export) and `uncreatable-type` (`PanelWindow`)
are lowered to `info`: printed, never failing. Every other category stays a warning, and
`--max-warnings 0` makes any warning fail.

- *Alternative: disable them.* Rejected: a real missing property of ours would go unseen. As
  info, they stay visible in the output.

### Lint where the tools exist

`shellcheck` runs everywhere: it is on the GitHub runners, and a missing `shellcheck` locally
is a failure. `qmllint` runs only where `/usr/share/omarchy/shell` exists; elsewhere the
script prints that it skipped it. QML is checked on every local run, and the CI checks what it
can.

### One family of doc styles

The styles follow the Google style guides the user already uses for Python. JSDoc is what the
Google JavaScript guide requires, and QML functions are JavaScript. The Google Shell guide
defines the function comment block. In QML, types live in the signature
(`function phaseColor(name: string): color`), so the JSDoc there has no `{type}`; in
`Logic.js` it does, which is what `tsc --checkJs` would read later.

### The style test reads the source

`tests/style.test.mjs` is plain text matching, like the docs tests:
- `Logic.js`: each top-level `function name(a, b)` is directly preceded by a `/** */` block
  with `@param` for each of `a` and `b`, plus `@returns` unless the function returns nothing.
- QML: each file starts its root object with a `/** */` block, and each `function` is
  preceded by one.
- Scripts: a header comment after the shebang. Each function has a comment directly above
  it: a `#` line for a one-line function, the Google block for a longer one. A predicate run
  by `check "<description>" <function>` in `tests/live.sh` is described by that line instead,
  so the description is not written twice.
- Python: a module docstring, and a docstring on every function.

The QML fixes and types come first, under the existing tests, and the comments follow, so a
behavior change cannot hide among comment edits.

## Risks / Trade-offs

- [Renaming `palette` misses a use] → `qmllint` flags unqualified or unknown names, and the
  live suite and `tests/theme-check.sh` render every character.
- [Typed QML functions change behavior: a typed parameter coerces its value] → Types follow
  what each function already receives. The live suite runs after an `omarchy restart shell`.
- [Comments go stale] → The style test checks they exist and name each parameter, not that
  they are true. Reviews still read them.
- [A future Quickshell exports the missing types] → The info categories just print less.
