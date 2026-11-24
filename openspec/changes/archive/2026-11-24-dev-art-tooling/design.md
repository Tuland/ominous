# Design

## Context

See proposal.md for the motivation. Constraints found in the repository:

- The marketplace installs a plugin with `omarchy plugin add <git-url>`: a clone of the whole
  default branch, updated by fast-forward pulls; `manifest.json` must sit at the repository
  root and plugin folders may not hold symlinks. Whatever git tracks reaches every user.
- `tests/packaging.test.mjs` fails when an ignore rule matches a tracked file
  (`git ls-files -ci --exclude-standard`) and when git tracks a symlink. It does not notice an
  ignore line being removed and the folder committed.
- `tools/lint.sh` runs shellcheck on `tools/*.sh`; `tests/style.test.mjs` requires a header
  comment and a comment on every function of every script in `tools/` (Google Shell Style
  Guide).
- `tests/docs.test.mjs` requires every relative link in the docs to resolve in a fresh
  checkout, where ignored folders do not exist; a backticked path in `docs/` is not checked.
  For the theme and release skills (`.claude/skills/ominous-*/SKILL.md`) it requires at least
  five backticked repository paths and every one to exist (a path with `<` is skipped).
- `tools/draw-themes.py` uses only the Python standard library, draws on a fixed `N = 16` grid,
  and runs on CI (`--check`) from a plain checkout through mise. `tests/themes.test.mjs`
  asserts the three shipped sprites are 16x16.
- The "Built-in themes" requirement (`openspec/specs/alert-themes/spec.md`) says built-in art
  SHALL be original and no built-in theme SHALL use a third-party name. `CLAUDE.md` adds
  "no traced sprites". `docs/themes.md` states that the current characters were drawn for the
  plugin and use no third-party artwork.
- The card draws each cell as a solid square of `max(3, round(Style.space(7)))` pixels, 7 at
  spacing scale 1, with no smoothing (`Alert.qml`, `components/PixelSprite.qml`).
- Codixel at `604a9dcbcc4e386bc48188b5f7f49099f5d04db7` was read before this change.
  `core/pixel.js` requires only `zlib` and `fs` (`P.load` and `P.save` read and write the paths
  they are given; the PNG decoder sets no size cap) and exports one object; it has no network
  or process API, `eval` or `new Function`. `SKILL.md` has no hidden characters. It does tell
  the agent to search the web for motion studies and formulas, to use local tools (ImageMagick,
  ffmpeg, PIL, rembg) to convert images, to accept CC BY references, to "do what the user
  decides" about someone else's artwork, to dither band edges, and to save previews in the
  user's project. Some of these conflict with this repository's rules (see the theme skill
  decision).

## Goals / Non-Goals

**Goals:**

- A developer gets codixel with one command, at a pinned commit, and it never becomes part
  of the plugin.
- Drafts never reach git, nothing tracked depends on them, and a test holds both.
- One documented contract for how art moves from drafts to tracked sources, so the marine
  change can implement it without new decisions.
- One written meaning of "original" that allows reference-based redraws and keeps the spec.

**Non-Goals:**

- No new art and no change to the four theme JSON files.
- No reader for grid files in `tools/draw-themes.py` and no exporter yet: no theme uses them,
  so they would be untested code. The marine change adds them with the first grids.
- No change to the sprite limits (32x32, 64 frames) and no `loopFrom`: those are behavior,
  with spec deltas, in the marine change. The color of burning pupils (`urgent` or hex) is
  decided there too.
- No port of the generator to another language; no change to `uv` or `mypy`.

## Decisions

### Fetch codixel with a script and a mise task, ignored by git

`tools/setup-dev.sh` (Bash, `set -euo pipefail`) holds the upstream URL and the full commit SHA:

1. Refuses to run when `.claude`, `.claude/skills` or `.claude/skills/codixel` is a symlink.
2. Creates a temporary directory with `mktemp -d /tmp/ominous-setup.XXXXXX`, outside the
   worktree; a trap removes it and the new-copy staging folder, on success or failure (never the
   old copy set aside in step 6).
3. Runs `git init` there and `git fetch --depth 1 <url> <sha>`, every git call with hooks off
   (`-c core.hooksPath=/dev/null`) and the caller's `GIT_DIR`-style variables unset, so it can
   only touch the temporary repository. There is no checkout, so no hook, smudge filter,
   attribute or submodule of the fetched tree is ever applied.
4. Checks that `git rev-parse FETCH_HEAD` equals the pinned SHA; otherwise exits non-zero
   before touching the destination.
5. For each of `SKILL.md`, `core/pixel.js` and `LICENSE`, checks with `git ls-tree` that the
   entry is a regular file (mode `100644`), and writes it with `git cat-file blob` into a
   staging folder next to the destination (`.claude/skills/.codixel-new`, same file system,
   ignored by git). Blob contents are fixed by the commit SHA, so no separate checksums are
   kept.
6. Swaps it in with two renames: the existing copy aside to `.claude/skills/.codixel-old`, the
   new one into place, the old one put back if that fails, and removed only once the new one is
   in. A copy left aside by an interrupted run is put back at the start of the next one. A failure in any
   earlier step leaves an existing copy untouched; an interrupted run is fixed by running it
   again.

The script is safe to run again and never executes anything from the fetched files.
`mise.toml` gets `[tasks.setup]` running it, and its header comment says it now also holds
tasks. A collaborator runs `mise install`, then `mise run setup`. Moving to a new SHA means
reading the new code first, as this change did; `docs/development.md` says so next to the
setup command.

Alternatives turned down:

- **Vendoring** the files: every user then installs agent-only, third-party code, the kind of
  content a marketplace review already questioned.
- **A git submodule**: the gitlink is part of the approved commit; a plain clone leaves it
  empty and a fast-forward pull does not move it; the marketplace says nothing about
  submodules.
- **A separate `dist` branch or repository** with only the plugin files: a second history to
  keep in step with the one CI tested, and it breaks the current `staging` to `main` flow.
- **Clone and checkout**, then copy: applies the developer's hooks and filters to a foreign
  tree and follows symlinks on copy.
- **Download the GitHub archive and check a checksum**: GitHub may regenerate archives with
  different bytes; a fetch by SHA is verified by git itself.
- **A mise tool entry**: mise pins tool versions, not repository contents; the task is only
  the entry point.

### The two folders are ignored, and a test says so

`.gitignore` ("This repository" section) gets `/.claude/skills/codixel/`, the two staging
folders of the script and `/drafts/`, with a comment on why. `tests/packaging.test.mjs` gets one test that runs `git check-ignore` once
per path, on `drafts/x` and on a file in `.claude/skills/codixel/` and in each of the two
staging folders, and fails unless each call
exits 0 and reports a rule of this repository's `.gitignore` for its own path (`-v`, with the
global excludes file turned off; one call with both paths exits 0 when either is ignored). With the
existing "no ignore rule matches a tracked file" test, removing a line or force-adding a file
both fail.

### Drafts are a gitignored folder at the root

`drafts/` holds reference images, draft scripts, candidate frames and comparison sheets.
Draft scripts may `require` codixel from `.claude/skills/codixel/core/pixel.js`, and pass
`P.load` and `P.save` paths under `drafts/` only. Previews are rendered there as PNG sheets and
read as images; nothing summons the card while exploring, so the user's session is not touched
until a direction is chosen. After that, the usual card checks apply (`tools/shoot-card.sh`,
`tests/theme-check.sh` with a warning first).

### Art crosses from drafts to tracked sources as text

The shared unit is the row: one palette letter per cell, every row of a frame the same length,
exactly as a theme file's `frames` arrays store it. The file around the rows is new and is
defined here so the marine change can build to it:

- path `tools/art/<theme>/<phase>.txt`, one file per phase (`relaxed`, `tense`, `angry`);
- frames in order, each a block of rows, blocks separated by exactly one empty line; no other
  lines, no comments, no trailing spaces;
- every frame in every phase of a theme has the same width and height.

The palette, captions, `frameMs`, `shake` and the JSON stay owned by `tools/draw-themes.py`.

The exporter in a draft script maps pixels to letters: a pixel with alpha 0 is `.`; a pixel
with alpha 255 must match exactly the RGB written for one letter; any other alpha, or an
unknown RGB, fails the export naming the pixel. Every letter's RGB is distinct, so the match is
never ambiguous.
Hex letters use their own color. A role letter (`accent`, `urgent`, `muted`, ...) has a fixed
stand-in RGB chosen in the draft for drawing and previews; it is not the live theme color,
which changes with the Omarchy theme. Grids are written only by the exporter, never retyped
from a picture.

This change documents the contract in the theme skill and `docs/development.md`; the marine
change implements the reader (with its `--check` coverage) and the exporter.

Alternatives turned down: **port the generator to Node** so it could share code with draft
scripts (what crosses is data, not code: the library works on RGBA buffers and PNG, knows
nothing of letter grids or palette roles, and is not present on CI); **PNG files as the
tracked source** (binary diffs, palette drift, no PNG decoder in the standard library);
**keep drawing with coordinates** (does not scale to 32x32 and dozens of frames).

### What "original" means

Built-in art is original when it uses no third-party artwork: no sprite, mascot, character,
illustration or frame by someone else. A redraw may start from a reference photo that is CC0,
public domain, or the author's own; never CC-BY (attribution inside a shipped plugin), never
CC-BY-SA (would bind the art's license), never a recognizable person. The reference may be
pixelated as a starting point; the shipped frames are redrawn by hand in the theme's palette,
with their own outline, expressions and animation, and checked at card size. A character may
use genre archetypes (square jaw, buzz cut, helmet), never a specific character, mascot or
person. A pixelated photo stays in `drafts/` and is never a shipped frame. The rule in
`CLAUDE.md` becomes one line: "Theme art is original: no traced or copied third-party art, no
third-party names or trademarks in theme names; references only CC0, public domain or own".
The source URLs of the references behind shipped art go in a References section of
`docs/themes.md`; the reference files stay in `drafts/`.

This keeps the "Built-in themes" requirement as written, so no spec delta. The sentence in
`docs/themes.md` about the current characters stays true and stays; the rule for redraws is
added after it.

### The theme skill defers technique to codixel, with named overrides

`.claude/skills/ominous-theme/SKILL.md`:

- follows codixel for technique (reference first, step by step, show every step) and says to
  run `mise run setup` to get it;
- lists the codixel instructions that Ominous rules override: references only CC0, public
  domain or own (not CC BY); someone else's artwork is never used, whatever the user decides
  in the moment; no dither at the card's cell size; files are written only in `drafts/`, plus
  the grid export to `tools/art/<theme>/`; local conversion tools only, and no web search for
  reference photos unless the user asks;
- states the spec limit (up to 32x32, 64 frames per phase) instead of "16x16 cells", and says
  the three current sprites are 16x16 and drawn as coordinates in `tools/draw-themes.py` until
  each is redrawn;
- describes the drafts-to-grid flow and the grid contract, and keeps the existing steps: card
  shots with `tools/shoot-card.sh`, `tests/theme-check.sh` only after asking, restoring
  `themes.json`, `tests/run.sh --unit`;
- keeps every existing character rule and pitfall: three expressions, animation growing with
  urgency (frame counts, `frameMs`, `shake`), captions, palette roles and colors, teeth, fangs,
  lips, not covering the outline, reading the text before the card;
- adds two pitfalls: no dither (a dithered cell reads as a stray square); fire is a material
  in a few hex tones, not `urgent`, so it looks the same under every Omarchy theme;
- keeps at least five backticked existing repository paths without `<` (as
  `tests/docs.test.mjs` requires of the skill), e.g. `tools/draw-themes.py`,
  `tools/shoot-card.sh`, `tests/theme-check.sh`, `tests/run.sh`, `tests/themes.test.mjs`,
  `docs/themes.md`.

Codixel's own skill file is never edited.

### Docs name ignored paths without linking them

`docs/development.md` and `docs/themes.md` may name `drafts/`, `.claude/skills/codixel/` and
`tools/art/<theme>/` in backticks, never as links, since a fresh checkout has none of them. In
the theme skill, where backticked paths must exist, they appear only with a `<` placeholder or
outside backticks.

## Risks / Trade-offs

- [Upstream disappears or rewrites history] → the SHA no longer fetches; theme work goes on
  without codixel, since nothing tracked depends on it.
- [Two skills trigger on "pixel art"] → `ominous-theme` names codixel and the overrides.
- [Draft scripts load third-party code and decode untrusted PNGs] → only the audited SHA is
  fetched; a new SHA is read before it is used; draft inputs are reference images the user
  chose; files are written under `drafts/` only.
- [A pixelated reference looks too close to the photo] → frames are redrawn by hand and the
  reference is never a recognizable person; the source is listed in `docs/themes.md`.
- [The grid contract turns out wrong when the marine is drawn] → it is only documented here;
  the marine change can amend it before any code depends on it.

## Migration Plan

Nothing to migrate: the plugin and the theme files do not change. An existing checkout runs
`mise run setup` once. Rollback is deleting the script, the task, the test and the ignore
lines.
