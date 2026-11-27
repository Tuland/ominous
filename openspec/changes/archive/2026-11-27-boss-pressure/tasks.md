# Tasks

## 1. The boss's frames and palette (drafts)

- [x] 1.1 Make the climb's exponent a parameter of `introSmoke` (and `introFrame`'s level) in
  `drafts/boss/work/intro-red.js`, instead of reading it from `process.argv`; the command line
  still passes it for the sheets. Verify: sheets 033, 034 and 035 rebuilt with their exponents
  (1.6, 1.6 with smoke, 1.2 with smoke) are equal pixel for pixel to the files on disk.
- [x] 1.2 Write `drafts/boss/work/frames.js`. It saves every approved frame to
  `drafts/boss/frames/<phase>-<n>.png` through the functions that made the approved sheets:
  - relaxed: `base40/relaxed.png`;
  - tense: the 12 frames that `closeup.js` writes when run with `SAVE_DIR` (it runs on load and
    exports nothing, so the writer runs it as a child process with a scratch sheet path that
    starts with `../`, as `drafts/shiba/work/frames.js` does);
  - angry: the 10 frames of `introSmoke` with the exponent 1.2 (sheet 035), then the 24 loop
    frames `withMark(frameAt(F, Y, dist, t), t < 8 ? Y : F, [2 + dx, 0 + dy])` with
    `[dx, dy] = shakeAt(t)` (sheet 031: the mark's place plus the tremble, the yell's bust for
    t < 8, the scowl's after).

  Verify: 1, 12 and 34 files; relaxed equal to `base40/relaxed.png`; tense equal to the files of a
  second `SAVE_DIR` run; angry equal, buffer for buffer, to `introSmoke` and `withMark`/`frameAt`
  called as above; and sheets `031-mark-deep.png` (`node mark-front.js ../<path to scratch>.png
  ../<path to scratch prefix>`, the still sheet as it was made; the tremble is covered by the buffer check)
  and `035-intro-start.png` (`node intro-red.js ../<path to scratch>.png ../<path to scratch prefix> smoke 1.2`; both scripts refuse a path without `../`)
  rebuilt in the scratchpad equal to the files on disk.
- [x] 1.3 Fit the palette to the printable ASCII letters (design.md, "Palette budget"): count
  the colors of all phases together; quantize only if they exceed the letters, keeping exact
  relaxed, tense, the outline, the drop blues, the anger mark's reds and the smoke's alpha
  steps (with 106 colors in angry alone, quantization is the expected branch). Show one sheet,
  `drafts/boss/036-palette-budget.png`, with the fitted frames next to
  the approved ones on a light and a dark card (relaxed, a tense close-up, intro frame 5, yell,
  scowl at half red), with the flash count of the fitted frames on both cards; a count above 2
  is a loss, whatever the look.
  - If the user sees a loss, switch to non-ASCII letters (the shiba's pool) and plan
    `ensure_ascii=False` for the boss's JSON in 2.1.
  - Verify: the sheet is read and shown to the user, and the verdict is recorded in
    `drafts/boss/history/HISTORY.md`.
- [x] 1.4 Write `drafts/boss/work/export.js` from the shiba's exporter, with the same grid
  contract. It writes `tools/art/boss/relaxed.txt`, `tense.txt` and `angry.txt` and prints
  `BOSS_PALETTE`; it refuses a palette over the budget of 1.3. Verify:
  - the three files hold 1, 12 and 34 blocks of 40 rows of 40 letters;
  - decoding the grids with the printed palette gives back the frames of 1.3 exactly;
  - a scratch PNG with an off-palette pixel, and one with an alpha no letter has, each make the
    export fail, naming the pixel.

## 2. Generator, theme file, character sheet, tests

- [x] 2.1 In `tools/draw-themes.py`:
  - add `BOSS_PALETTE` and build the boss from `read_grids("boss", BOSS_PALETTE)`;
  - phases: tense `frameMs` 900, `loopFrom` 8; angry `frameMs` 120, `shake`, `loopFrom` 10;
    captions "Let's circle back.", "Can you see my screen?", "Again? The whole team is
    waiting."; phase colors unchanged;
  - remove `boss()`, `N`, `blank`, `put`, `rect`, `rows` and the `Grid` alias if nothing else
    uses them, and update the module docstring and comments (every playful character from
    grids);
  - if 1.3 chose non-ASCII letters, write the boss's JSON with `ensure_ascii=False` and keep
    the other themes byte for byte;
  - regenerate `themes/boss.json` with `tools/draw-themes.py --show` and read the frames as text.

  Verify: `mise exec -- tests/run.sh --unit` passes (art check, mypy); decoding
  `themes/boss.json` with its own palette gives the frames of 1.3 cell for cell; the palette
  holds no role name; the file size is noted against the shiba's.
- [x] 2.2 In `tests/themes.test.mjs`, move the boss from 16 to 40 in the size loop, add it to
  the intro test with the marine and the shiba, and pin what the generic tests let through: the
  three captions ("Let's circle back.", "Can you see my screen?", "Again? The whole team is
  waiting."), tense 12 frames at 900 ms with `loopFrom` 8, angry 34 frames at 120 ms with
  `loopFrom` 10 and `shake`, and no role name in the palette. Verify: `mise exec --
  tests/run.sh --unit` passes, the flash test included; scratch copies with the old caption
  "Per my last email.", angry `frameMs` 250, or angry `loopFrom` 9 each fail.
- [x] 2.3 Update `tools/art/characters.schema.json` with the labels of design.md ("Character
  sheet and schema"): `angry.intro` `flush`, `angry.faces` `yell` and `scowl`, `angry.aura`
  `smoke`, the new key `angry.sign` (`anger-mark`, `none`) and its `codixel` entry; add
  `angry.sign: none` to the marine's and the shiba's sheets. Rewrite
  `tools/art/boss/character.json`: `1.0.0`, `redrawn`, realistic, the references, the palette
  size, the timings, `tense.closeup` `held`, `angry.intro` `flush`, `angry.faces` `yell` then
  `scowl`, `angry.aura` `smoke`, `angry.sign` `anger-mark`, `angry.particles` `none`,
  `angry.shake` `on-loop`, `angry.flashes` the count measured in 1.3 (at most 2, recorded in
  HISTORY.md), `colors.roles` empty, caption voice `jargon`, and the
  `codixel` map part by part. Update the description of `angry.faces` so it admits a held face.
  In the character test, assert those boss values (the generic checks only see that a label
  exists). Verify: `mise exec -- tests/run.sh --unit` passes; a scratch label `steam` for the
  boss's `angry.aura` fails, naming it; a scratch boss sheet with `tense.closeup` `none` fails.

## 3. Docs and skill

- [x] 3.1 Update the docs:
  - `docs/themes.md`: the boss's row (smug, then holding his temper with darting eyes, a sweat
    drop and one close-up, then red climbs his face, smoke rises off him and an anger mark
    trembles while he yells), the new angry caption, no tie in a role color; the References:
    six edits of one expression sheet the author generated; the smoke, the red and the anger
    mark are drawn in code;
  - `docs/themes.md`, the paragraph under the table: no shipped character draws cells in a role
    color any more (drop "such as its tie"); the boss, like the marine and the shiba, uses fixed
    colors only;
  - `docs/development.md` ("Drawing the shipped characters") and the layout lines in
    `CLAUDE.md`: every playful character is drawn from `tools/art/<theme>/`.

  Verify: `mise exec -- tests/run.sh --unit` passes (`tests/docs.test.mjs`); `grep -rn -i
  "boss\|coordinates\|Per my last" README.md CLAUDE.md docs` shows nothing outdated.
- [x] 3.2 Update `.claude/skills/ominous-theme/SKILL.md` with the edits of design.md ("The theme
  skill"): the anger-mark exception to the outline pitfall, the colors bullet rewritten whole
  (fixed reds for an anger mark, no `accent` tie or `muted` steam), and the opening paragraph
  (every character 40x40 from grids). Nothing else. Verify: the diff is shown to the user;
  `mise exec -- tests/run.sh --unit` passes.
- [x] 3.3 Bring the drafts' records in line with what ships: `drafts/boss/history/HISTORY.md`
  (the shipped frame counts, timing and palette choice), `drafts/diagrams/architecture.md` (no
  character left in coordinates) and `drafts/diagrams/pixel-art.md` (the boss's smoke as a
  second user of alpha cells). Verify: each file names what ships; `grep -n "coordinates"
  drafts/diagrams/*.md` shows nothing outdated.

## 4. On the card

- [x] 4.1 Look at the boss on the card. Say first that real alerts are held.
  - `tools/shoot-card.sh boss playful <phase>` for relaxed and tense, with a short and a
    three-line title;
  - for angry, several shots across the intro and the loop, each with its own
    `OMINOUS_SHOOT_WAIT`.

  Verify: the shots are read and shown to the user; the bust sits on the title-to-caption band,
  inside the card, the smoke and the mark clear of the text; `holdSeconds` is 0 afterwards.
- [x] 4.2 After asking the user, run `tests/theme-check.sh <scratchpad>/themes` with the boss
  under a light and a dark Omarchy theme with different accent and urgent colors. Verify: the
  shots are read and shown; on `boss-<theme>-angry.png` of both themes (the mark shows only in
  angry; the default wait of about 1.6 s lands past the 1.2 s intro), one tie cell and one mark
  cell read from the PNGs: the tie cell has the same color in both PNGs, and so does the mark
  cell; one smoke cell is within 3 per channel of its `#rrggbbaa` blended over each theme's card
  (the spec's new scenario); the smoke reads as smoke and not as
  a box; the script restores the theme and says so.

## 5. Integration

- [x] 5.1 Run `mise exec -- tests/run.sh --restart --refresh`. Say first that it shows a card
  that grabs the keyboard for about a minute. Verify: every check passes; `tests/results.log`
  has the new line; `omarchy-shell ominous status` shows `holdSeconds` 0.

## 6. Review

- [x] 6.1 Run a code review and a security review of this change's diff in a separate context: a
  fresh Cursor reviewer in a herdr pane with a neutral brief (read-only, no network, no `gh` or
  `curl`, no shell experiments; only what to read and the answer format), plus `/code-review`
  and `/security-review`. Read the diff against the proposal, the spec delta, the design and the
  Security section of `docs/development.md`, with attention to the grid reader and the theme
  JSON as untrusted input paths. Check the reviewer's commands in its transcript afterwards; fix
  the findings inside the change and take decisions to the user.

## Workflow follow-up

- Archive the change once the Review group is ticked, then commit when the user asks.
- After archiving, add the user-visible items under `## [Unreleased]` in `CHANGELOG.md`, and edit
  the line that says the boss and user themes are drawn smaller until redrawn: only user themes
  now. Then release 0.4.0 (all three characters redrawn) with the `ominous-release` skill, which
  redoes `preview.png`.
