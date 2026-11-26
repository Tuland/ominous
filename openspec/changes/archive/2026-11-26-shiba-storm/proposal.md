# Proposal

## Why

The shiba is still a 16x16 sprite drawn as coordinates. Since `marine-inferno` set the card's
cell for a 40x40 grid, it shows at 80 pixels next to a 200-pixel marine, and its three frames of
anger have no build-up. An explore in `drafts/shiba/` (sheets 001-055, with the road in
`drafts/shiba/history/`) drew a new shiba at 40x40 from images the author generated. The user
approved every phase, sheet by sheet. This change ships it, and makes the shared parts of the
two redrawn characters explicit before the boss is redrawn.

## What Changes

- **A redrawn shiba.** An original red shiba, a front-facing bust at 40x40 (not the meme pose),
  with the realistic shading of its references. It comes from two sheets the author generated:
  four moods, and the same sheet with the eyes turned.
  - relaxed: one frame, a happy squint with the tongue out.
  - tense: worried, eyes darting, a sweat drop. As with the marine, one close-up on the face when
    the phase begins, then the bust again in a loop (12 frames at 900 ms, `loopFrom` 8).
  - angry: a transformation, then a loop.
    - The transformation: night falls, a storm mist gathers round the head, and the eyes light
      up green-yellow.
    - The loop: a burst of barks, then a snarl, in a night storm. Bolts fall behind the head,
      down a margin behind the shoulder, and far away.
    - Each near strike lights the dog: one flat flash, then backlight or side light. Between
      strikes the dog stays in night light, with eyeshine.
    - 34 frames at 120 ms, `loopFrom` 10; the jolt lands on the first strike.
  - The mist is the only background. It is drawn with semi-transparent cells over the card, in
    angry only; relaxed and tense stay cut-outs.
  - Captions stay as they are.
- **Semi-transparent sprite cells, specified.** A hex color with alpha (`#rrggbbaa`) in a
  palette is drawn over the card, so the card shows through it. The renderer already does this
  and the docs list the format; the shiba is the first shipped theme to rely on it.
- **A flash limit for shipped themes.** A shipped theme's sprite never flashes more than twice in
  any second, on a light card or a dark one. The count is modelled on WCAG 2.3.1's general flash,
  stricter (WCAG allows three), measured on the whole sprite and its halves; it is not a full
  WCAG area analysis, and the red-flash threshold is not covered. A unit test counts it for
  every shipped theme (today's marine, shiba and boss: zero).
- **The marine's skin.** Its skin and brown tones get 30% more saturation: only the palette
  changes, not the frames. This was accepted during the explore, next to the shiba.
- **The shiba's art as text grids.** `tools/draw-themes.py` reads the shiba from
  `tools/art/shiba/<phase>.txt`, written by a draft exporter. The coordinate drawing goes. The
  grid contract gains semi-transparent letters.
- **What the characters share, decided with the user.** Near the end, everything the marine and
  the shiba have in common is listed. Each item is marked standard (kept for every character),
  precedent (reused when it fits) or coincidence, and the user approves the list item by item.
  Only the approved standards and the safety limits go into the `ominous-theme` skill. The rest
  stays as precedent in the drafts' history, open to revision for the boss without touching the
  characters already done.
- **Name guard.** The test that keeps third-party names out of theme files also refuses
  "doge", "dogecoin" and "kabosu".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `alert-themes`:
  - "Pixel-art sprites": a hex color with alpha is drawn over the card.
  - "Animation grows with urgency": shipped themes flash at most twice a second.

## Impact

- `tools/draw-themes.py` (the shiba from grids, its palette, `loopFrom`; the marine's skin
  tones), `tools/art/shiba/` (new, tracked), `themes/shiba.json` and `themes/marine.json`
  (regenerated).
- `tests/themes.test.mjs`: the shiba at 40x40 with intros, the flash count for every shipped
  theme, the name guard.
- Docs: `docs/themes.md` (the shiba's look, its references), `docs/custom-themes.md`
  (semi-transparent cells), `.claude/skills/ominous-theme/SKILL.md` (the approved standards,
  the grid contract with alpha).
- No `Logic.js` or QML change is expected: palette keys may be any single character and the
  canvas already blends alpha. No config, IPC or packaging change. `preview.png` waits for the
  release, after the boss.
- The palette: the accepted frames use about 400 colors against the marine's 52 (see design).
