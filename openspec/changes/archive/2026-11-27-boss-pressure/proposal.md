# Proposal

## Why

The boss is the last character still drawn as a 16x16 sprite in coordinates. Next to the
200-pixel marine and shiba it shows at 80 pixels, and its angry phase is three frames with no
build-up. An explore in `drafts/boss/` (sheets 001-035, the road in
`drafts/boss/history/HISTORY.md`, items 1-45) drew a new boss at 40x40 from images the author
generated, and the user approved every phase sheet by sheet. This change ships it, the last step
before release 0.4.0.

## What Changes

- **A redrawn boss.** An original older office manager, a front-facing bust at 40x40: bald dome,
  grey hair at the sides, navy suit, white shirt, red tie. Realistic shading, pixelated from
  images the author generated (six edits of one expression sheet). The concept is a pressure
  cooker: the meeting coming makes the pressure rise.
  - relaxed: one frame, smug and cold.
  - tense: holding his temper, eyes darting, a sweat drop (the standard drop). One close-up on
    the face when the phase begins, then the bust in a loop (12 frames at 900 ms, `loopFrom` 8).
  - angry: an intro, then a loop.
    - The intro: he holds a scowl while red climbs his skin like mercury, from the neck to the top
      of the dome, and smoke gathers behind him (10 frames).
    - The loop: a held yell, then the scowl. His skin flushes full red in the yell and half red in
      the scowl, rising again toward the next yell. Grey smoke rises steadily off his body,
      behind him, as semi-transparent cells. A manga anger mark sits in front, in the head's
      upper-left corner, and trembles like an earthquake: every frame in the yell, every other
      frame in the scowl.
    - 34 frames at 120 ms, `loopFrom` 10. `shake` as the other characters: the jolt lands on
      loop frame 0, the first yell.
  - The boss uses fixed colors only: the tie no longer takes the theme's accent or urgent color.
  - Captions: relaxed "Let's circle back." and tense "Can you see my screen?" stay; angry becomes
    "Again? The whole team is waiting." (the alert is about being late, not about email).
- **The boss's art as text grids.** `tools/draw-themes.py` reads the boss from
  `tools/art/boss/<phase>.txt`, written by a draft exporter, like the marine and the shiba. The
  coordinate drawing goes; no character is drawn as coordinates any more.
- **The character sheet.** `tools/art/boss/character.json` becomes version 1.0.0, `redrawn`. The
  schema gains the labels the boss needs (its intro, faces, smoke, anger mark).
- **The theme skill.** It catches up with the redrawn boss, and two rules change as decided in the
  explore: the anger mark is an
  exception to the pitfall about the face outline (in manga it sits in front, over the contour),
  and an anger mark uses fixed reds, not the `urgent` role (a vein stops reading as blood when the
  theme's urgent is not red). The lines that describe the legacy boss (16x16, coordinates, a tie
  in `accent`, steam in `muted`) go.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `alert-themes`: "Built-in themes": the boss is described without the tie taking the accent and
  urgent colors.

## Impact

- `tools/draw-themes.py` (the boss from grids, its palette and timings, the coordinate code
  removed), `tools/art/boss/` (grids and character sheet), `tools/art/characters.schema.json`
  (new labels), `themes/boss.json` (regenerated).
- `tests/themes.test.mjs`: the boss at 40x40 with intros, in the intro test with the marine and
  the shiba; the flash test already covers every shipped theme.
- Docs: `docs/themes.md` (the boss's look, captions, references, role colors), `docs/development.md`
  and `CLAUDE.md` (no character left in coordinates), `.claude/skills/ominous-theme/SKILL.md`.
- No `Logic.js` or QML change is expected: the renderer already plays intros, alpha cells and the
  jolt. No config, IPC or packaging change. `preview.png` is redone in the release.
- Drafts (git-ignored): a frames writer and an exporter in `drafts/boss/work/`, as for the shiba.
