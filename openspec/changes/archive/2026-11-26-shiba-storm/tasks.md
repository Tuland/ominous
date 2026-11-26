# Tasks

## 1. Semi-transparent cells, the flash limit, the name guard

- [x] 1.1 Confirm on the live card that a `#rrggbbaa` cell blends over the card (design, "Risks").
  - Say first that real alerts are held during the shot.
  - Write a scratch theme in the scratchpad: a 2x2 sprite, one letter `#00000080`, one
    `#000000`. Shoot it with `tools/shoot-card.sh <scratch path> playful relaxed <out.png>`, which
    carries the theme in the payload: no user theme file is touched.
  - In `docs/custom-themes.md`, next to the hex forms, say that a color with alpha is drawn over
    the card, which shows through.
  - Verify:
    - in the shot, the half cell is within 3 per channel of the 50% blend of black and the
      card's background, read from the PNG;
    - `omarchy-shell ominous status` shows `holdSeconds` 0;
    - `mise exec -- tests/run.sh --unit` passes.
- [x] 1.2 In `tests/themes.test.mjs`, add the flash counter and a test over every shipped theme
  with a sprite, every phase, on a light and a dark card, as in design.md ("Flash limit"): roles
  as fixed stand-ins, alpha blended over the card, the intro once and then the loop repeated,
  windows of `floor(1000 / frameMs)` steps.
  - Verify: a hand-made phase that alternates black and white frames at 120 ms makes the
    counter report more than 2.
  - Verify: `mise exec -- tests/run.sh --unit` passes on today's themes (counted 0 everywhere
    before the change).
- [x] 1.3 In `tests/themes.test.mjs`, make the name guard check the file name and the captions
  only, not the frames (grid rows are runs of palette letters and can spell a word by chance),
  and refuse `doge`, `dogecoin` and `kabosu` besides `doom` and `id software`, case-insensitive.
  Verify:
  - the guard refuses a scratch theme with the caption "Kabosu says hi";
  - it accepts one whose frame row holds "doge";
  - `mise exec -- tests/run.sh --unit` passes on the shipped files.

## 2. The shiba's frames and palette (drafts)

- [x] 2.1 Write `drafts/shiba/work/frames.js`. It saves every approved frame to
  `drafts/shiba/frames/<phase>-<n>.png` through the same functions that made the approved
  sheets:
  - relaxed: `base40/relaxed.png`;
  - tense: the 12 frames of `closeup.js` (sheet 054);
  - angry: the 10 intro frames and 24 loop frames of `angry-proto.js night` with
    `BG=mist FIX=light,halo INTRO=1` (sheets 049-051, 055).

  Verify: 1, 12 and 34 files, each equal pixel for pixel to the approved file where one exists:
  - relaxed: `base40/relaxed.png`;
  - tense: the close-up frames `variants/close-<i>.png`, and the bust frames rebuilt from
    `base40/tense.png` and `tense-left.png` with the drop;
  - angry: `variants/intro-light/intro-<i>.png` and `<t>.png` (sheet 055), with the loop also
    against `variants/seq-mist-ground2/<t>.png` (sheet 049).
- [x] 2.2 Fit the palette to about 90 ASCII letters, as in design.md ("Palette budget"):
  - quantize over all phases together;
  - keep exact every color of relaxed and tense, and in angry the outline, the eyeshine, the
    bolts and the mist's alpha steps;
  - choose the other colors of angry with codixel's quantizer, weighted by cell count.

  Show one sheet, `drafts/shiba/056-palette-budget.png`, with the quantized frames
  next to the approved ones on a light and a dark card: relaxed, the tense close-up, the angry
  intro halfway, night, flash, afterglow and side.
  - Print on the sheet the flash count of the quantized frames on both cards; above 2 is a loss.
  - If the user sees a loss, switch to non-ASCII letters (the pool in design.md) and plan
    `ensure_ascii=False` for the shiba's JSON in 3.1.
  - Verify: the sheet is read and shown to the user, and their verdict is recorded in
    `drafts/shiba/history/HISTORY.md`.
- [x] 2.3 Write `drafts/shiba/work/export.js` from the marine's exporter, with the grid contract
  in design.md ("semi-transparent letters"). It writes `tools/art/shiba/relaxed.txt`,
  `tense.txt` and `angry.txt`, and prints the palette for `tools/draw-themes.py`. It refuses a
  palette over the budget chosen in 2.2. Verify:
  - the three files hold 1, 12 and 34 blocks, one letter per cell;
  - decoding the grids with the printed palette gives back the frames of 2.2 exactly;
  - a scratch PNG with an off-palette pixel, and one with an alpha that no letter has, each
    make the export fail, naming the pixel.

## 3. Generator, theme file, tests and docs

- [x] 3.1 In `tools/draw-themes.py`:
  - **Palette and frames:** add `SHIBA_PALETTE`, printed by the exporter, and build `SHIBA` from
    `read_grids("shiba", SHIBA_PALETTE)`.
  - **Phases:** captions and phase colors unchanged; tense `frameMs` 900 with `loopFrom` 8;
    angry `frameMs` 120 with `shake` and `loopFrom` 10.
  - **Clean-up:** remove the `shiba()` coordinate drawing, and update the module docstring
    (marine and shiba from grids, boss as coordinates). If 2.2 chose non-ASCII letters, write
    the shiba's JSON with `ensure_ascii=False` and keep the other themes byte for byte.
  - **Regenerate:** `themes/shiba.json` with `tools/draw-themes.py --show`, then read the frames
    as text.

  Verify:
  - `mise exec -- tests/run.sh --unit` passes (art check, mypy);
  - decoding `themes/shiba.json` with its own palette gives the frames of 2.2 cell for cell (a
    wrong hex pasted into `SHIBA_PALETTE` fails here);
  - the size of `themes/shiba.json` is noted against the marine's.
- [x] 3.2 In `tests/themes.test.mjs`, move the shiba from 16 to 40 in the size loop, and turn the
  marine's intro test into one for both the marine and the shiba: tense and angry play an intro
  once, then loop, and the jolt waits for the loop. Verify:
  - `mise exec -- tests/run.sh --unit` passes, the flash test of 1.2 included, for the new
    shiba;
  - the shiba test fails when a scratch copy sets its angry `loopFrom` to 0.
- [x] 3.3 Saturate the marine's skin: in `MARINE_PALETTE`, multiply by 1.3 the saturation of
  the tones with hue 45 or below, lightness 0.12 or above and saturation below 0.45, with the
  values of `drafts/shiba/work/marine-skin.js` (sheet 013). Regenerate `themes/marine.json`.
  Verify:
  - `git diff themes/marine.json` changes palette lines only;
  - `mise exec -- tests/run.sh --unit` passes;
  - a `tools/shoot-card.sh marine playful relaxed` shot is shown to the user next to sheet 013,
    after saying that alerts are held, with `holdSeconds` 0 afterwards.
- [x] 3.4 Update the docs:
  - `docs/themes.md`:
    - the shiba's row: content, then worried with darting eyes, a sweat drop and one close-up,
      then night falls and it barks and snarls in a lightning storm, eyes shining;
    - the sentence on role colors: the shiba now uses fixed colors only;
    - the References: two images the author generated (a sheet of four moods, the same sheet
      with the eyes turned); the storm, mist and lightning are drawn in code.
  - `docs/development.md` ("Drawing the shipped characters") and the layout lines in
    `CLAUDE.md`: the shiba is drawn from `tools/art/shiba/`, and only the boss is still
    coordinates.

  Verify:
  - `mise exec -- tests/run.sh --unit` passes (`tests/docs.test.mjs`);
  - `grep -rn "shiba" README.md CLAUDE.md docs` shows nothing outdated.

## 4. On the card

- [x] 4.1 Look at the shiba on the card. Say first that real alerts are held.
  - Take `tools/shoot-card.sh shiba playful <phase>` shots for relaxed and tense, with a short
    title and a three-line title.
  - For angry, take several shots across the intro and the loop, each with its own
    `OMINOUS_SHOOT_WAIT`.

  Verify:
  - the shots are read as images and shown to the user;
  - the bust is centred on the title-to-caption band, inside the card, and the mist stays
    clear of the text;
  - `holdSeconds` is 0 afterwards.
- [x] 4.2 After asking the user, run `tests/theme-check.sh <scratchpad>/themes` with the shiba
  under a light and a dark Omarchy theme. Verify:
  - the shots are read and shown to the user;
  - on both themes the mist reads as a soft night and not as a box;
  - on both, one mist cell read from the PNG is within 3 per channel of its `#rrggbbaa` blended
    over that theme's card background (the dark half of the spec's alpha scenarios);
  - the script restores the theme and says so.

## 5. What the characters share

- [x] 5.1 List everything the marine and the shiba share (method, look, timing, effects, rules)
  from `drafts/marine/history/HISTORY.md` and `drafts/shiba/history/HISTORY.md`.
  - Mark each item standard, precedent or coincidence, with one line of reason.
  - Go through the list with the user, item by item; the user decides.
  - Record the verdicts in section 5 of `drafts/shiba/history/HISTORY.md`, the one list; its
    section 4 then points at section 5 instead of keeping its own binding list.
    `drafts/marine/` is not touched.

  Verify: every item carries the user's verdict.
- [x] 5.2 Update `.claude/skills/ominous-theme/SKILL.md` with:
  - the standards approved in 5.1;
  - the safety limits (at most 2 flashes a second, readable on light and dark cards);
  - the grid contract with semi-transparent letters;
  - corrections of lines that the approved list contradicts (for example `accent` for a sweat
    drop);
  - the character sheet's keys, a shared vocabulary for every character, asked by the user in
    5.1 (the values of each character stay in the drafts' history).

  Nothing else.
  - Verify: the diff of the skill is shown to the user.
  - Verify: `mise exec -- tests/run.sh --unit` passes.
- [x] 5.3 Bring the drafts' records in line with what ships: `drafts/shiba/history/HISTORY.md`,
  `PROMPTS.md` and `flow.md`, and `drafts/diagrams/pixel-art.md` (a line on semi-transparent
  cells; the marine's sections untouched). Verify: each file names the shipped frame counts,
  timing and palette choice of this change.

- [x] 5.4 At the user's request, sum up each character in `tools/art/<theme>/character.json`
  (marine, shiba, boss) with the keys, types and labels of `tools/art/characters.schema.json`,
  one level up; a new label goes into the schema first. In `tests/themes.test.mjs`, check every
  character file against the schema (keys, labels, types) and against its theme file (timings,
  palette size, roles, flash count); point the skill's "Character sheet" and
  `docs/development.md` at the files. Verify: `mise exec -- tests/run.sh --unit` passes, and a
  scratch label `smoke` for the shiba's `angry.aura` fails the test, naming it. Each sheet also
  carries `version` (semver) and `status`: the boss `0.1.0` `legacy` (below 1.0.0: not a model,
  to revise at its redraw), the marine `1.1.0` (its skin tones), the shiba `1.0.0`, both
  `redrawn`; the test ties `legacy` to a version below 1.0.0. A `codixel` map records, part by part, which
  codixel tools built it (or `none`), with parts and tools as schema labels.

## 6. Integration

- [x] 6.1 Run `mise exec -- tests/run.sh --restart --refresh`. Say first that it shows a card that
  grabs the keyboard for about a minute. Verify:
  - every check passes;
  - `tests/results.log` has the new line;
  - `omarchy-shell ominous status` shows `holdSeconds` 0.

## 7. Review

- [x] 7.1 Run a code review and a security review of this change's diff in a separate context:
  - a fresh Cursor reviewer in a herdr pane, with a neutral brief (read-only, no network, no
    `gh` or `curl`, no shell experiments; only what to read and the answer format);
  - plus `/code-review` and `/security-review`.

  Read the diff against the proposal, the spec delta, the design and the Security section of
  `docs/development.md`, with attention to the grid reader and the theme JSON as untrusted
  input paths.
  - Check the reviewer's commands in its transcript afterwards.
  - Fix the findings inside the change, and take decisions to the user.

## Workflow follow-up

- Archive the change once the Review group is ticked, then commit when the user asks.
- After archiving, add the user-visible items under `## [Unreleased]` in `CHANGELOG.md`, and edit
  the existing line that says `shiba`, `boss` and user themes are drawn smaller until redrawn:
  only `boss` and user themes now. No release until the boss is redrawn too (one release at the
  end, 0.4.0).
