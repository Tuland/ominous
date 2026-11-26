# Design

## Context

See proposal.md for the motivation and specs/alert-themes/spec.md for the behavior. The
repository and the drafts today:

- `tools/draw-themes.py` draws the shiba as coordinates on a 16x16 grid (`shiba(mood, variant)`,
  `SHIBA`), and the marine from `tools/art/marine/<phase>.txt` through `read_grids`.
  `read_grids` checks the shape of the grids and that every letter is a key of the palette; it
  does not look at the colors. The palette is a literal dict in the script (`MARINE_PALETTE`,
  52 colors). The JSON is written with `json.dumps(..., indent=2)`, so any non-ASCII letter
  would become a `\uXXXX` escape.
- `Logic.normalizeSprite` accepts any palette key of length 1 and any color string of up to 40
  characters. Frames are at most 40x40 cells and 64 frames per phase.
- `components/PixelSprite.qml` resolves each token with the shell's `Color.flatColor`. For a
  hex token that ends in `Geometry.canonicalColor`, which reads `#rrggbbaa` and returns
  `Qt.rgba(r, g, b, a)`. It then paints runs of cells with `fillRect` on one `Canvas`, so a
  color with alpha blends over what is behind it, the card. This was read in the code, not yet
  seen on a live card.
- `tests/themes.test.mjs` ("shipped themes") checks the marine at 40x40 and the shiba and boss
  at 16x16, three distinct expressions, an angry phase faster than tense, and intros for the
  marine. A name guard refuses `doom` and `id software` in theme files.
- The accepted frames are in `drafts/shiba/work/` (git ignores `drafts/`):
  - relaxed: `base40/relaxed.png` (`pipe.js` `base()`, `save-base.js`);
  - tense: `closeup.js` composes the 12 frames, bust and close-up, sheet 054;
  - angry: `angry-proto.js night` with `BG=mist FIX=light,halo INTRO=1` gives 10 intro frames
    and 24 loop frames (sheets 049-051 and 055).
- The accepted frames use 395 distinct colors with all phases together. Most of them come from
  the night grading and the light of the strikes; 14 of them carry alpha (the mist).
- The marine's draft exporter (`drafts/marine/work/export.js`) accepts alpha 0 and 255 only.
  The theme skill's grid contract says the same.

## Goals / Non-Goals

**Goals:**

- Ship exactly what the user approved on the sheets, through the marine's road: frames as
  PNGs, then text grids, then the generator. The JSON is never edited by hand.
- Keep the grids readable as text and the theme file a reasonable size.
- A flash limit that is checked for every shipped theme, not only the shiba.
- The skill learns only what the user approves as a standard (see "What the characters
  share").

**Non-Goals:**

- New captions: the current ones stay.
- The boss: its own change, later.
- Changes to `Logic.js` or the QML: the renderer already handles everything the shiba needs.
- Redrawing the marine: only its skin tones change, in the palette.
- A release or a new `preview.png`: they come after the boss.

## Decisions

### Frames: PNGs from the draft scripts, then the marine's exporter contract

A draft script, `drafts/shiba/work/frames.js`, writes every approved frame to
`drafts/shiba/frames/<phase>-<n>.png`:

- relaxed: 1 frame;
- tense: 12 frames;
- angry: 34 frames, the intro first.

It calls the same functions that made the approved sheets, so nothing is redrawn. A second
script, `drafts/shiba/work/export.js` (the marine's, adapted), turns them into
`tools/art/shiba/<phase>.txt` and prints the palette for `tools/draw-themes.py`. Alternative:
copy the frames out of the variants folders by hand. Rejected, because a rerun of the drafts
would then drift from the shipped frames.

### Grid contract: semi-transparent letters

A pixel with alpha 0 is `.`. Any other alpha must match exactly the RGBA of one letter: a
letter with alpha 255 is written `#rrggbb`, and one with alpha in between is written
`#rrggbbaa`. Every letter has a distinct RGBA. An unknown RGBA still fails the export, naming
the pixel.

The palette stays a literal dict in `tools/draw-themes.py`, as for the marine. `read_grids`
refuses a letter that is not in the palette and `--check` a JSON that differs from the script's
output, but neither sees a wrong hex pasted into the dict: the decode in task 3.1 does (see
"Palette budget"). Alternative: a palette file read by the generator. Not needed with that
decode, and a second way to hold a palette is more to review.

### Palette budget: up to about 90 ASCII letters

The approved frames use 395 colors, and a sprite letter must be one character. Two ways:

1. **Reduce the colors to the ASCII letters** that need no escaping in JSON: about 90
   (letters, digits, and punctuation other than `.`, `"` and `\`). Merging near-identical colors
   is not enough on its own: within an RGB distance of 3 there are still 321 colors, and only at
   about 16 do they get down to 88. So the reduction is a real quantization:
   - over all phases together;
   - every color of relaxed and tense kept exact (the approved day faces, 35 colors), and in
     angry the outline, eyeshine, bolts, haze and the mist's alpha steps;
   - the other colors of angry chosen by codixel's quantizer (`P.quantize`: farthest-point seeds,
     then k-means, weighted by how many cells use them).
2. **Keep every color with non-ASCII letters.** The pool must hold 395: ASCII as above, then
   letters from Latin-1, Latin Extended-A and B, Greek and Cyrillic. Each is one BMP code point,
   so one UTF-16 unit (`Logic.normalizeSprite` drops a sprite whose key is longer), not combining
   and not whitespace (`str.rstrip` would eat it). The look stays exactly as approved, but:
   - the grids stop being plain text to read;
   - the JSON grows. With the default escaping, each cell costs 6 bytes; without it, 2.
   - the theme travels in the card's payload, and the marine's is already 85 KB.

Decision: try option 1 first. The result goes on a sheet next to the approved frames, one change
on that sheet, for the user's verdict. If the user sees a loss, take option 2 and write the JSON
with `ensure_ascii=False`, and say so in the task. Either way, the exporter refuses a palette
over its budget. The sheet also prints the flash count of the quantized frames; above 2 is a loss
for the user, and the limit is never loosened.

Pasting the printed palette into `SHIBA_PALETTE` is guarded by more than `read_grids` and
`--check`, which do not see a wrong hex: task 3.1 decodes `themes/shiba.json` with its own
palette and requires the frames of the palette task, cell for cell.

### Flash limit: a unit test over every shipped theme

The test lives in `tests/themes.test.mjs`, with a small helper in the test, not in `Logic.js`:
nothing decides on it at run time. For every shipped theme with a sprite, every phase and both
cards:

- **Light and dark cards:** stand-in backgrounds `#eef0f6` and `#0a0c22`, as in the drafts.
- **Theme roles:** fixed stand-ins per card. On the light card: `foreground` `#2a2b3a`,
  `accent` `#3c6edc`, `urgent` `#d23232`, `muted` `#8c8c96`. On the dark card: `#e6e4f4`,
  `#78a0ff`, `#f05050`, `#6e6e82`. `background` is the card itself.
- **Colors with alpha:** blended over the card.
- **Luminance:** the mean relative luminance of the sprite's cells, frame by frame, over the
  whole sprite and over each half (top, bottom, left, right: 200x100 px, about WCAG's smallest
  counted area, so a local strike is not diluted by the whole mean); an empty cell counts as the
  card behind it. Shiba angry: 2 in every area, on both cards.
- **Sequence:** the frames as the card plays them: the intro once, then the loop repeated until
  every window that starts in the intro or the first loop is whole (a 2-frame loop at 120 ms
  repeated only twice is shorter than one window and would hide its flashes).
- **Windows:** every window of `floor(1000 / frameMs)` frame steps (8 at 120 ms, as the drafts'
  `flashes(a, a + 8)`).
- **Count:** the pairs of opposing changes of at least 0.1 where the darker side is below 0.8,
  with changes in the same direction merged. This is the counter the drafts used for sheets
  033-055.

The spec wording maps onto it. Counted before this change with a throwaway script: 0 flashes in
every phase of today's marine, shiba and boss, on both cards. The marine's tense moves the most
(0.3 on the light card, bust against close-up), but at 900 ms a frame. Alternative: count over
the whole card. Rejected: the sprite is what moves, and the 200-pixel sprite is above WCAG's
small-area exemption on its own.

### Timing, as the marine

- **tense:** `frameMs` 900, `loopFrom` 8.
- **angry:** `frameMs` 120, `shake`, `loopFrom` 10. The jolt lands on loop frame 0, the first
  strike, through the existing `Logic.joltOnStep`.
- **Phase colors:** relaxed `accent`, angry `urgent`, tense unset, unchanged.

### The marine's skin

Only `MARINE_PALETTE` changes: the skin and brown tones (hue 45 or below, lightness 0.12 or
above, saturation below 0.45) get their saturation multiplied by 1.3, as on sheet 013
(`drafts/shiba/work/marine-skin.js`). The grids stay as they are. The outline, the olive gear,
the fire and the drop blues are outside that range and do not move.

### What the characters share: a list the user approves

This task comes after the art, the docs and the theme check, and before the skill.

- **List:** every shared item, from `drafts/marine/history/HISTORY.md` and
  `drafts/shiba/history/HISTORY.md`.
- **Proposal:** one of three marks per item: standard, precedent or coincidence.
- **Verdicts:** the user goes through the items one by one, and the verdicts go into section 5
  of the shiba's HISTORY.md. `drafts/marine/` stays read only.
- **What goes into the skill:**
  - the approved standards;
  - the safety limits (at most 2 flashes a second, readability on light and dark cards);
  - the grid contract with alpha;
  - corrections of lines that the approved list contradicts.

  An example of a contradiction: the skill still says `accent` for a sweat drop, while both
  characters ship fixed light blues.
- **What stays out:** precedents and coincidences stay in the history, so that the boss can
  reuse or revise them.

## Risks / Trade-offs

- [The quantized palette loses the smooth night grading or the backlight] → A sheet next to the
  approved frames; if the user sees a loss, non-ASCII letters (option 2).
- [The live card reads `#rrggbbaa` differently from the code reading, for example as ARGB] →
  The theme check on a light and a dark Omarchy theme shows the mist and reads one of its cells.
  Before that, a scratch theme with one `#00000080` cell, passed by path to
  `tools/shoot-card.sh`, confirms the blend (task 1.1).
- [`shiba.json` grows: 47 frames of 1600 cells against the marine's 46] → About the marine's
  size with ASCII letters; measured in the task.
- [CPU] → The same renderer, frame count and rate as the marine, which measured 6.7% of a core
  on the canvas. Measure it again only if the card feels slow in the theme check.
- [The history is rebuilt in part from a summary, sheets 003-011] → The verdicts are taken from
  the user, not from the text.

## Migration Plan

None: user themes are untouched, and a user theme named `shiba` still wins over the shipped
one. To roll back, revert the commit.
