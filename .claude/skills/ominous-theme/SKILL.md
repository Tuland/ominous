---
name: ominous-theme
description: Create or change an Ominous theme or its pixel-art character (marine, shiba, boss or a new one). Use when asked to draw, redraw, fix or add a character, an expression, a caption or a theme's colors, or to review how a theme looks.
---

# Drawing an Ominous theme

A playful theme is one original character with three expressions, one per phase: **relaxed**,
**tense** and **angry**. The shipped characters are drawn by `tools/draw-themes.py`, which
writes `themes/<name>.json`. A user's own theme is a JSON file in
`~/.config/omarchy/ominous/themes/` (format: `docs/custom-themes.md`). Never edit a shipped
theme's JSON by hand: `tests/run.sh` fails when it differs from the script.

Today `marine`, `shiba` and `boss` are 16x16 and drawn as coordinates in `tools/draw-themes.py`
(`tests/themes.test.mjs` checks the size). Each is being redrawn, one change at a time, from
reference images through drafts into text grids (see "Redrawing a character"). Until a
character is redrawn, small fixes to it stay in the coordinate code.

## Technique: codixel, with Ominous rules on top

For new or redrawn art, follow the codixel skill for technique: start from a reference image,
go step by step, show every step as a picture and check it with the user. Get it once with
`mise run setup` (it lands in `.claude/skills/codixel/`, which git ignores; the plugin never
ships it). Where codixel and this skill disagree, this skill wins:

- **References:** only CC0, public domain, or made by the user. Not CC BY, not CC BY-SA, never
  a recognizable person. Someone else's artwork is never used, whatever is decided in the
  moment.
- **No web search for reference photos** unless the user asks for one; then only the licenses
  above. Local conversion tools (ImageMagick, ffmpeg, PIL) are fine.
- **Files are written only in `drafts/<theme>/`**: every `P.load`, `P.save` and `P.gif` path
  starts there, never a bare name like codixel's examples (a bare name lands in the repository
  root). The one exception is the exporter, which writes only `<phase>.txt` grids to
  `tools/art/<theme>/`.
- **Downscale references first** with ImageMagick or PIL to a plain PNG of at most 1024 pixels
  a side before `P.load`: codixel's PNG decoder sets no size limit.
- **No dither** (see the pitfalls): skip codixel's dither steps and its final check that band
  edges show a dither strip.

## Rules for the character

- **Original.** Built-in art uses no third-party artwork: no sprite, mascot, character,
  illustration or frame by someone else, traced or copied. A reference photo (licenses above)
  may be pixelated as a starting point in `drafts/`; the shipped frames are redrawn by hand in
  the theme's palette, with their own outline, expressions and animation. A pixelated photo is
  never a shipped frame. Genre archetypes are fine (a square jaw, a buzz cut, a helmet); a
  specific character, mascot or person is not. Do not use a trademark in the theme name, the
  file name or the captions (e.g. `marine`, not `doom`). A nod in `docs/themes.md` is fine, and
  the source URL of every reference behind shipped art goes in its References section.
- **Size:** up to 32x32 cells and 64 frames per phase (the spec limit;
  `openspec/specs/alert-themes/spec.md`, "Pixel-art sprites"), one face or a bust (`boss` has
  collar and tie). Every frame of every phase has the same size. The card shows each cell as a
  whole-pixel square, 7 screen pixels at the default scale.
- **Animation grows with urgency:** relaxed is one still frame; tense has 2 slow frames
  (`frameMs` ~900: eyes dart, a sweat drop slides); angry has fast frames (`frameMs` ~250) and
  `"shake": true`.
- **Captions:** one ironic line per phase, 80 characters at most, in the character's voice.
- **Colors:** use roles where the color should follow the Omarchy theme: `urgent` for anger
  marks and glowing eyes, `accent` for a sweat drop or a tie, `muted` for steam. Use hex for skin,
  fur, hair and fire. A near-black hex outline (`#1b1511`) reads on light and dark themes alike.
  Phase colors: relaxed `accent`, tense left unset (the card blends accent into urgent), angry
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
- No dither: each cell is a solid square, so a dithered cell reads as a stray square, not a
  blend.
- Fire is a material, like skin: a few hand-picked hex tones (deep red, orange, yellow, a pale
  yellow core, never white), not `urgent`, so it burns the same under every Omarchy theme.

## Redrawing a character

1. **References.** Agree with the user on 2-3 reference images (licenses above) and keep them
   in `drafts/<theme>/` with their source URLs.
2. **Drafts.** Work in `drafts/<theme>/` with codixel: pixelate, then redraw by hand. Show
   candidates side by side on one PNG sheet per question (e.g. two sizes, or three mouths), read
   the sheet as an image, and let the user keep or drop each idea. Short rounds. Nothing here
   summons the card.
3. **Export.** When a direction is chosen, a draft script writes the frames as text grids; never
   retype a grid from a picture. The contract:
   - path `tools/art/<theme>/<phase>.txt`, one file per phase;
   - frames in order, each a block of rows, one palette letter per cell, every row the same
     length; blocks separated by exactly one empty line; no other lines, comments or trailing
     spaces;
   - pixel to letter: alpha 0 is `.`; alpha 255 must match exactly the RGB of one letter; any
     other alpha or an unknown RGB fails the export, naming the pixel. Every letter has a
     distinct RGB. A role letter (`accent`, `urgent`, ...) uses a fixed stand-in RGB chosen in
     the draft, not the live theme color.

   `tools/draw-themes.py` will read the grids (the reader comes with the first redrawn
   character; until then nothing reads them) and keeps owning the palette, captions, `frameMs`,
   `shake` and the JSON.
4. Then the checks in "Workflow" below, from step 2.

## Workflow

1. **Draw.** A character not yet redrawn: in `tools/draw-themes.py`, a function
   `name(mood, variant)` that builds each frame from one base face, a palette, and an entry in
   `THEMES`. A redrawn one: its grids (see above). Then run `tools/draw-themes.py --show` and
   read every frame as text.
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
