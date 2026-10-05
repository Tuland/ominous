# Design

## Context

See `proposal.md` for the motivation. `Logic.js` starts with `.pragma library`, a QML
directive that is not JavaScript; the unit tests already strip that line before running the
file under node. Tool versions live in `mise.toml`, which the CI installs with `mise-action`.
TypeScript 7 is the native compiler and enables `strict` by default.

## Goals / Non-Goals

**Goals:**
- The JSDoc types in `Logic.js` and the hints in `tools/draw-themes.py` are checked on every
  local run and on the CI.
- Zero errors at the strictest setting each tool offers.

**Non-Goals:**
- Converting `Logic.js` to TypeScript: QML loads it as JavaScript.
- Checking the JavaScript inside QML files: `qmllint` already covers it.
- Checking the tests: they are the proof of behavior, not the subject.

## Decisions

### Check a copy without the pragma

`tools/lint.sh` writes `Logic.js` without its first line to a temporary folder and runs
`tsc --noEmit --allowJs --checkJs --strict --target es2017 --lib es2017` on it. The flags are on
the command line, so there is no `tsconfig.json` or `jsconfig.json` to keep in step. ES2017 is
below what Qt's JavaScript engine supports, so the checker never accepts syntax QML would
reject.

- *Alternative: `// @ts-nocheck` around the pragma.* Rejected: the pragma is a syntax error,
  which no comment can hide.

### Precise types, not suppressions

Errors are fixed by making the JSDoc say what the code does: `Object<string, number>` for a
map, `@type` on a local that starts empty, a typed callback parameter. No `@ts-ignore` or
`any` unless a value is genuinely untrusted input (a parsed file or payload is `*`, as the
docs already say).

### TypeScript 7, from npm through mise

TypeScript 7 is the native (Go) compiler: the line TypeScript continues on, much faster, and
`strict` by default. Version 6.0 is the last JavaScript-based release, kept for migration. The
`npm:typescript` package carries the native binary for each platform, and mise installs it
with the pinned `node`, the same way on the runner as locally.

- *Alternative: TypeScript 6.0 or 5.9.* Rejected: the older line, which only gets fixes; the
  move to 7 would come later anyway.

### mypy installed by a pinned uv

`mise.toml` pins `uv` and declares `"pipx:mypy" = { version = "2.4.0", uvx = true }`: mise
runs `uv tool install mypy==2.4.0` with that `uv` (checked in a scratch folder), so neither the
local machine nor the runner needs `pipx`.

### mypy strict, standard library only

`mypy --strict tools/draw-themes.py`. The script uses only the standard library, so there are
no stubs to install. Grids are `list[list[str]]`, frames `list[str]`, and the theme table a
`TypedDict` or a plain `dict[str, Any]` where its shape is the JSON's.

### Missing checker fails

As with `shellcheck`, a missing `tsc` or `mypy` fails the lint with a hint (`mise install`),
because both come from `mise.toml` and are always present where the setup was followed. Only
`qmllint` is skipped, since it comes with the Omarchy shell.

## Risks / Trade-offs

- [A type fix changes behavior] → In `Logic.js` only comments change, plus the parentheses a
  JSDoc cast needs (`/** @type {string[]} */ (MODES)`, for membership tests on untrusted
  strings) and one declaration moved to its own line to carry a type. The unit tests and a
  diff of the JavaScript tsc emits without comments, before and after, prove it. In Python, `draw-themes.py --check` shows
  the themes are byte for byte the same.
- [TypeScript 7 is new and its JSDoc support differs from 5.x] → It is pinned; if a JSDoc form
  is not understood, use a simpler form rather than downgrading.
- [uv or the npm package fail to install on the runner] → Both are pinned and installed by
  mise-action like `node`; the first CI run after this change checks it.
