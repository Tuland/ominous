---
name: ominous-theme
description: Create or change an Ominous theme or its pixel-art character (marine, shiba, boss or a new one). Use when asked to draw, redraw, fix or add a character, an expression, a caption or a theme's colors, or to review how a theme looks.
---

# Drawing an Ominous theme

A playful theme is one original character with three expressions, one per phase: **relaxed**,
**tense** and **angry**. The shipped characters are code in `tools/draw-themes.py`, which writes
`themes/<name>.json`. A user's own theme is a JSON file in `~/.config/omarchy/ominous/themes/`
(format: `docs/custom-themes.md`). Never edit a shipped theme's JSON by hand: `tests/run.sh`
fails when it differs from the script.

## Rules for the character

- **Original.** Draw from scratch. Do not trace a game sprite, a meme image or a mascot, and do not
  use a trademark in the theme name, the file name or the captions (e.g. `marine`, not `doom`).
  A nod in `docs/themes.md` is fine.
- **16x16 cells**, one face (a bust is fine: `boss` has collar and tie). The card shows each
  cell as a whole-pixel square.
- **Animation grows with urgency:** relaxed is one still frame; tense has 2 slow frames
  (`frameMs` ~900: eyes dart, a sweat drop slides); angry has 2-3 fast frames (`frameMs` ~250)
  and `"shake": true`. Every frame of every phase has the same size.
- **Captions:** one ironic line per phase, 80 characters at most, in the character's voice.
- **Colors:** use roles where the color should follow the Omarchy theme: `urgent` for anger
  marks and glowing eyes, `accent` for a sweat drop or a tie, `muted` for steam. Use hex for skin,
  fur and hair. A near-black hex outline (`#1b1511`) reads on light and dark themes alike. Phase
  colors: relaxed `accent`, tense left unset (the card blends accent into urgent), angry
  `urgent`.

## Pixel pitfalls already met

- A solid white bar in a mouth does not read as teeth. Teeth are single white pixels with dark
  gaps between them, or two 1-pixel fangs.
- Fangs suit animals, not people: an angry human scowls (mouth corners pulled down) or yells (a
  dark open mouth with a red tongue).
- Lips drawn in the outline color right under the nose read as a moustache. Use the mouth color.
- Do not overwrite the face outline with other details (a sweat drop, a vein): keep them inside
  the face or outside the head.
- Read the ASCII first, then the rendered card. Some problems only show at real size.

## Workflow

1. **Draw** in `tools/draw-themes.py`: a function `name(mood, variant)` that builds each frame
   from one base face, a palette, and an entry in `THEMES`. Then run
   `tools/draw-themes.py --show` and read every frame as text.
2. **Look at it rendered**, one phase at a time:
   `tools/shoot-card.sh <theme> playful <relaxed|tense|angry> <scratchpad>/<theme>-<phase>.png`
   and read the image. To see the animation, take a few shots 0.25 s apart. `shoot-card.sh`
   summons a synthetic meeting on an opaque veil, so the picture never contains the user's
   desktop. Do not take raw screenshots of the screen instead.
3. **Light and dark themes:** `tests/theme-check.sh <scratchpad>/themes` shows every character
   under a light and a dark Omarchy theme, then restores the user's theme and proves it. It
   switches the user's Omarchy theme for a minute, so ask before running it.
4. **A new shipped theme** also needs:
   - its name in the loops of `tests/themes.test.mjs` (shipped themes exist; three distinct
     expressions);
   - a row in the table of `docs/themes.md`;
   - the "Built-in themes" requirement in `openspec/specs/alert-themes/spec.md`, through an
     OpenSpec change;
   - a place in `tools/make-preview.sh` if it should appear in `preview.png`. The marketplace
     picture is regenerated only with that script, and looked at before committing.
5. **Check:** `tests/run.sh --unit` (unit tests, and themes against `tools/draw-themes.py`).
   After a QML change, use `tests/run.sh --restart` instead.

Leave the user's choices as they were. If `omarchy-shell ominous theme` was used to look at a
theme, put `~/.local/state/ominous/themes.json` back afterwards. Show the user the rendered
images before committing art.
