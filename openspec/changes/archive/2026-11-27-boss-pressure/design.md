# Design

## Context

See proposal.md for the motivation and specs/alert-themes/spec.md for the behavior. The
repository and the drafts today:

- `tools/draw-themes.py` reads the marine and the shiba from `tools/art/<theme>/<phase>.txt`
  through `read_grids`, with a literal palette dict per theme (`MARINE_PALETTE`,
  `SHIBA_PALETTE`). The boss is still `boss(mood, variant)` on a 16x16 grid, with the helpers
  `blank`, `put`, `rect` and `rows` and the constant `N = 16`, which only the boss uses. Its
  palette maps the tie and the steam to the roles `accent`, `urgent` and `muted`.
- The shiba's road (`shiba-storm`, archived) is the precedent: `drafts/shiba/work/frames.js`
  writes the approved frames as PNGs, `palette.js` fits them to the ASCII letters (sheet 056),
  `export.js` writes the grids and prints the palette. The grid contract allows
  semi-transparent letters (`#rrggbbaa`).
- `tests/themes.test.mjs` checks the marine and the shiba at 40x40 and the boss at 16x16, the
  intro test covers the marine and the shiba, the flash test covers every shipped theme, and the
  character-sheet test ties `tools/art/<theme>/character.json` to its theme file and the schema.
- The accepted boss frames, all made by scripts in `drafts/boss/work/` (git ignores `drafts/`):
  - relaxed: `base40/relaxed.png`;
  - tense: the 12 frames of `closeup.js` (`SAVE_DIR`), sheet 015: bust, bust, bust with the other
    gaze, five close-up frames, then four bust frames, the drop sliding, `loopFrom` 8;
  - angry intro: `intro-red.js` `introSmoke` with the climb's exponent 1.2 (sheet 035);
  - angry loop: `body-smoke.js` `frameAt` (sheet 025: flush pulse, held yell, smoke) with
    `mark-front.js` `withMark` and `shakeAt` (sheet 031: the anger mark, deep reds over the head,
    the tremble).
- Counted on the accepted frames: angry uses 106 colors, 18 of them with alpha (the smoke);
  relaxed 26. Tense adds the close-up's tones. Flash count 0 on both stand-in cards.

## Goals / Non-Goals

**Goals:**

- Ship exactly what the user approved on the sheets, through the shiba's road: frames as PNGs,
  then text grids, then the generator. The JSON is never edited by hand.
- Remove the last coordinate drawing from the generator.
- Record in the skill only the two rules the user decided in the explore, and remove its lines
  about the legacy boss.

**Non-Goals:**

- Changing the marine or the shiba.
- Changes to `Logic.js` or the QML.
- The relaxed and tense captions, and the phase colors (relaxed `accent`, angry `urgent`).
- The release, `preview.png` and the changelog's release line: they follow, in 0.4.0.

## Decisions

### Frames: PNGs from the draft scripts

`drafts/boss/work/frames.js` writes every approved frame to `drafts/boss/frames/<phase>-<n>.png`
by calling the functions that made the approved sheets (relaxed 1, tense 12, angry 10 + 24 = 34).
The climb's exponent, today read from the command line in `intro-red.js`, becomes a parameter of
`introSmoke`, so the writer passes 1.2 without faking arguments; the approved sheets 033-035 are
rebuilt identical with their exponents. Alternative: copy frames out of sheets by hand. Rejected:
a rerun of the drafts would drift from the shipped frames.

### Palette budget: the shiba's ASCII letters

The shiba fitted 395 colors into 91 printable ASCII letters (less `.`, `"` and `\`) with a
quantization the user could not tell apart. The boss starts from far fewer colors. Same plan:

- if all phases together fit the letters, no quantization;
- otherwise quantize over all phases together, keeping exact every color of relaxed and tense,
  the outline, the sweat drop's fixed blues, the anger mark's five reds and the smoke's alpha
  steps; the rest (the flush levels and smoke tones) by codixel's quantizer weighted by cell
  count;
- a flash count above 2 on the fitted frames is a loss, whatever the look; with 106 colors in
  angry alone, quantization is the expected branch;
- either way, a sheet next to the approved frames (relaxed, a tense close-up, the intro halfway,
  yell, scowl at half red) on a light and a dark card, with the flash count, for the user's
  verdict. Non-ASCII letters only if the user sees a loss.

The exporter refuses a palette over its budget, and an RGBA that no letter has, naming the pixel.

### Generator

`BOSS_PALETTE` (printed by the exporter) and `read_grids("boss", BOSS_PALETTE)`, as for the
shiba. Phases: tense `frameMs` 900, `loopFrom` 8; angry `frameMs` 120, `shake`, `loopFrom` 10, so
the existing `Logic.joltOnStep` lands the jolt on loop frame 0 (the `angry.shake` standard,
`on-loop`). `boss()`, `N`, `blank`, `put`, `rect` and `rows` go with it, and the module docstring
says every playful character comes from grids. The palette holds hex colors only, which is what
the spec's new scenario asks: the sprite no longer follows the theme's roles.

### Character sheet and schema

`tools/art/boss/character.json` becomes `1.0.0`, `redrawn`, realistic, with the boss's values.
The schema gains only the labels the boss needs, each added before it is used (and the
description of `angry.faces` admits a held face, not only "a short burst, then the long one"):
`angry.intro` `flush`, `angry.faces` `yell` and `scowl`, `angry.aura` `smoke`, and a new key
`angry.sign` (`anger-mark`, `none`; marine and shiba `none`) with its own `codixel` entry. The
boss's `angry.particles` becomes `none` (the steam was dropped) and `colors.roles` an empty list.

### The theme skill

- The pitfall "Do not overwrite the face outline with other details (a sweat drop, a vein)" keeps
  the drop and gains the exception: an anger mark sits in front, in a corner of the head, over
  the contour if it must (sheets 027-028).
- "use roles ... `urgent` for anger marks" becomes fixed reds for an anger mark, with the reason
  (Cursor's, item 34): a vein stops reading as blood when the theme's urgent is not red.
- The colors bullet is rewritten whole: the legacy boss's `accent` tie and `muted` steam go, and
  every playful character uses fixed colors.
- The opening paragraph that says the boss is still 16x16 and drawn as coordinates says that
  every character is 40x40 and drawn from grids.

## Risks / Trade-offs

- [Quantizing smooths the red climb or the smoke] → The budget sheet beside the approved frames;
  the user's verdict decides, non-ASCII letters if a loss shows.
- [`boss.json` grows from 3 KB to about the shiba's 86 KB] → The same order as the two other
  characters, which already travel in the payload.
- [The anger mark's tremble near the dome contour shimmers on the live card] → Seen in the theme
  check at real size on a light and a dark Omarchy theme.
- [The smoke's alpha cells read differently on a live theme] → The shiba already ships alpha
  cells, checked live; the theme check shows the smoke on both themes.
- [A user theme named `boss`] → Still wins over the shipped one; untouched.

## Migration Plan

None: user themes are untouched. To roll back, revert the commit.
