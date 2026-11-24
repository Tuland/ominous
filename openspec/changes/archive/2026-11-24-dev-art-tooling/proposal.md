# Proposal

## Why

The shipped characters are 16x16 and drawn pixel by pixel as coordinates in
`tools/draw-themes.py`. At that size a mouth has two rows, so every smile reads as an emoticon
(`:-)`), and detail stays coarse. The next changes redraw the characters one by one (the marine
first, with burning eyes and a fire that grows into a hysterical laugh), at 32x32 or more, with
many more frames. Drawing that as coordinates does not scale, and drawing it from imagination
gives poor pixel art. This change sets up the tools and the rules for that work before any art
changes: reference images, a pixel-art skill for exploration, a drafts area that git ignores,
and a documented way for chosen art to reach tracked sources.

## What Changes

- **Codixel for exploration, not shipped.** `tools/setup-dev.sh`, run by a new mise task
  (`mise run setup`), fetches the third-party Claude Code skill codixel
  (`https://github.com/mankidev/codixel`, MIT) at one full commit SHA, and writes only
  `SKILL.md`, `core/pixel.js` and `LICENSE`, as regular files read straight from git objects
  (no checkout, no symlink), into `.claude/skills/codixel/`. Git ignores that folder by its
  exact path, so the plugin that users clone never contains it; a unit test asserts it is
  ignored. The URL and SHA are written in the tracked script.
- **Drafts area.** `/drafts/` is ignored by git, also asserted by the test: reference images,
  draft scripts, candidate frames and comparison sheets live there while a direction is
  chosen. Nothing in it is shipped or needed by tests or CI.
- **Art as text grids (contract only).** The documented path from drafts to tracked sources:
  draft scripts export chosen frames as text files under `tools/art/<theme>/`, one per phase,
  each frame a block of rows of palette letters (the rows a theme file stores), never retyped
  from a picture; `tools/draw-themes.py` will read them. The generator stays Python (standard
  library only) and never imports codixel: what crosses is data, not code. The reader and the
  exporter are built in the marine change, with the first grids that use them; until then the
  three current characters stay drawn as coordinates, and their JSON does not change.
- **What "original" means, and references.** Built-in art stays original as the spec requires:
  it uses no third-party artwork (no sprite, mascot, character or illustration by someone
  else). A redraw may start from a reference photo that is CC0, public domain or the author's
  own, never CC-BY or CC-BY-SA and never a recognizable person, and may pixelate it as a
  starting point; the shipped frame is then redrawn by hand in the theme's palette, with its
  own outline, expressions and animation. Characters may use genre archetypes, never a specific
  character, mascot or person. The source URLs of the references behind shipped art are listed
  in `docs/themes.md`. A pixelated photo stays in `drafts/` and is never a shipped frame. The
  rule in `CLAUDE.md` becomes "Theme art is original: no traced or copied third-party art, no
  third-party names or trademarks in theme names; references only CC0, public domain or own".
- **Theme skill.** `.claude/skills/ominous-theme/SKILL.md` follows codixel for technique
  (reference first, step by step, show every step) and names the codixel instructions that the
  Ominous rules override (licenses, someone else's artwork, dither, where files are written).
  It states the spec limit instead of a fixed 16x16 (the three current sprites stay 16x16 and
  their tests say so), describes the drafts-to-grid flow, keeps the card checks, and adds two
  pitfalls: no dither at card cell size; fire is a material in hex tones, not `urgent`.
- **Docs.** `docs/development.md` (setup, layout table, drawing the shipped characters),
  `docs/themes.md` (the rule for redraws, a References section) and `CLAUDE.md` (layout and
  theme rule) describe the above.

No change to the plugin: no QML, `Logic.js`, theme JSON, config, IPC or packaging change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is tooling, docs, tests and agent skills only (`skip_specs: true`). The "Built-in
themes" requirement already says built-in art SHALL be original, and the meaning above keeps
it: no third-party artwork. The 16x16 size was a workflow rule in the theme skill, not a
requirement: the spec already allows sprites up to 32x32. Raising that limit, if 48x48 wins,
and the one-time intro before a looping phase (`loopFrom`) belong to the marine change, with
their spec deltas.

## Impact

- New: `tools/setup-dev.sh`, a `setup` task in `mise.toml`. The script is tracked, so the
  installed plugin grows by that one small file; codixel itself never reaches it.
- Changed: `.gitignore`, `tests/packaging.test.mjs` (the two folders are ignored),
  `.claude/skills/ominous-theme/SKILL.md`, `docs/development.md`, `docs/themes.md`,
  `CLAUDE.md`, the docstring of `tools/draw-themes.py`.
- Developer machines: `mise run setup` needs `git` and network access once; CI does not run it.
- Unchanged: the four theme JSON files and everything the plugin runs.
