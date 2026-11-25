# Proposal

## Why

The marine is 16x16 cells, drawn as coordinates. At that size its mouth has two rows, so the
smile reads as an emoticon (`:-)`) and the angry face is coarse. The angry phase is also just a
three-frame loop, so the moment the user is late has no build-up. Pixelation tests with
reference images in `drafts/marine/` showed that a face reads at 40x40 (the eyes and a
symmetric mouth survive), only partly at 32x32, and not at 16x16. `dev-art-tooling` set up the
tools for a redraw; this is the first character to use them, and it sets the size and
animation rules that shiba and boss will follow in their own changes.

At the same time, a design review of the card (Cursor, as a designer) found three layout
problems. They show up as soon as the sprite grows: the sprite is pinned to the top of the
title, so with a long title the countdown sits next to empty space. The column has one
spacing for everything. And in the angry phase the caption repeats the phase color, so three
red lines stack up.

## What Changes

- **A bigger sprite limit.** Sprites may be up to 40x40 cells (was 32x32); 64 frames per phase
  stays.
- **A frameless phase keeps the rest of the sprite.** A user theme with an empty frame list in
  one phase lost its whole sprite once the theme went through the card's payload. Now that
  phase alone has no sprite (found while testing `loopFrom` across the payload).
- **A redrawn marine.** An original soldier bust (a rounded olive steel-pot helmet, stubble, a
  broad jaw and thick neck, an olive webbing vest over a dark t-shirt). The helmet carries the
  "soldier" stereotype: in a bust cut below the collar, the uniform alone is mostly outside the
  grid. It is drawn from a reference the author generated (`drafts/marine/refs/ai-sheet-04`):
  pixelated at 40x40, helmet and vest pushed to olive, an outline, and defects fixed by hand.
  The photo's realistic shading stays; a cartoon redraw was tried and rejected.
  - relaxed: one frame, a half smile;
  - tense: eyes darting and a sweat drop, slow frames, with one close-up on the face when the
    phase begins, like a standoff in a Western, then the bust again;
  - angry: a one-time ignition (embers in the eyes, eyes on fire, sparks, a fire aura around
    the silhouette), then a looping villain laugh (head bob, open dark mouth with separated
    teeth).
  - Fire uses a few hex tones (deep red, orange, yellow, pale yellow core), not `urgent`.
  - The grid is 40x40: at 32x32 the face under the helmet's brim turned into a smudge.
- **Intro frames, then a loop.** A phase may set `loopFrom`. Its frames play once from the
  first, then cycle from frame `loopFrom` to the last. A missing or out-of-range value means 0:
  every frame loops, as today.
- **The jolt waits for the loop.** In a phase with `loopFrom`, the angry jolt comes when the
  loop starts, at the end of the intro, instead of when the phase begins. The intro plays
  again from the first frame whenever the card opens, the phase changes, or the mode or theme
  switches. An update to the meeting's details on an open card does not replay it.
- **The sprite cell follows the chosen grid.** It is `Style.space(5)` for 40x40 or
  `Style.space(6)` for 32x32, about 200 px either way at scale 1 (was `Style.space(7)`). Shiba
  and boss stay 16x16 and get smaller on the card until their own redraws. No release comes
  in between.
- **Card layout.**
  - The sprite is centred vertically on the band that runs from the title to the last line
    above the buttons.
  - The card grows taller rather than let the sprite run outside it.
  - The column gets a grouped rhythm instead of one spacing: title and time close together, a
    gap before the countdown, the caption next to it, a gap before the buttons, the hints
    close to the buttons.
  - The caption takes the card's text color. The phase color stays on the countdown, the
    calendar notice, the selected button and the progress bar.
- **Art as text grids, implemented.**
  - `tools/draw-themes.py` reads the marine's frames from `tools/art/marine/<phase>.txt`, in
    the contract `dev-art-tooling` defined.
  - A draft exporter writes those files from the chosen frames.
  - shiba and boss stay as coordinates.
- **References rule, refined.**
  - Reference images in `drafts/` may show real people, or be images the author generated,
    since they are never shipped.
  - Shipped art must not resemble a recognizable person, character or mascot.
  - Licenses stay as before: CC0, public domain or the author's own.
  - For a reference the author made (an own photo or a generated image), the shipped frames may
    start from its pixelation, reduced to the theme's palette and fixed by hand. Third-party
    references (CC0, public domain) stay a guide only.
  - The `ominous-theme` skill also asks for flat frontal light and a flat background in
    reference images: rim light turns into white stripes when pixelated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `alert-themes`: the sprite size limit goes to 40x40. The animation gains `loopFrom`, with
  the angry jolt at the start of the loop. The playful layout centres the sprite and keeps it
  inside the card. Captions take the text color.

## Impact

- `Logic.js`: sprite limit, `loopFrom` normalization, next-frame, jolt-timing and sprite
  placement functions, with unit tests in `tests/themes.test.mjs`.
- `components/PhaseSprite.qml` (frame advance, jolt timing), `Alert.qml` (cell size, sprite
  position, card height, column rhythm, caption color).
- `tools/draw-themes.py` (grid reader, marine from grids, new palette), `tools/art/marine/`
  (new, tracked) and `themes/marine.json` (regenerated).
- Docs: `docs/custom-themes.md` (`loopFrom`, 40x40), `docs/themes.md` (marine, references),
  `docs/development.md` (limits table), `.claude/skills/ominous-theme/SKILL.md`, `CLAUDE.md`
  (theme rule wording).
- No config, IPC or packaging change. `preview.png` is regenerated at release time, after all
  three characters are redrawn.
- Performance: 40x40 means 1600 cell rectangles in `PixelSprite`, against 256 today. The
  change measures this before it is done.
