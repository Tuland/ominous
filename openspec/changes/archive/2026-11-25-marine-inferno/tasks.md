# Tasks

## 1. Sprite limit and the intro-then-loop animation

- [x] 1.1 In `Logic.js`, raise `MAX_SPRITE` to 40, and add `loopFrom` to each normalized phase: the value when it is an integer with `0 <= loopFrom < frames.length`, else 0. Add `loopFrom` to the `PhaseLook` typedef. Add `Logic.nextFrame(index, count, loopFrom)`, `Logic.joltOnEnter(phase, spec)`, `Logic.joltOnStep(phase, spec, from, to)` and `Logic.sameArt(before, after)`, as in design.md ("`loopFrom`", "The jolt follows the loop start"), with typed JSDoc and entries in the index at the top of the file. In `tests/themes.test.mjs`, move the "too wide" and "too tall" malformed cases from 33 to 41 cells. Verify: new cases cover a 40x40 sprite kept, a 41-wide one dropped, `loopFrom` 3, -1, 1.5 and `"2"` on 3 frames becoming 0, a valid `loopFrom` kept, the 7-frame sequence with `loopFrom` 4 (0..6, then 4, 5, 6, 4), a jolt on entry only without `loopFrom`, a jolt on step only into `loopFrom` from the frame before it (one-frame and multi-frame loops), no jolt outside angry, and `sameArt` true for two separately normalized copies of one theme and false when a frame, the palette or `loopFrom` differs; `mise exec -- tests/run.sh --unit` passes (including `tests/style.test.mjs` on the index)
- [x] 1.2 In `components/PhaseSprite.qml`, step frames with `Logic.nextFrame`, gate `maybeShake()` with `Logic.joltOnEnter`, and restart the shake on a step where `Logic.joltOnStep` is true. Make `onThemeChanged` rewind only when `Logic.sameArt(previous, theme)` is false, keeping the previous theme in a property of the component (null at first, so the first theme rewinds). In `Alert.open()`, call `sprite.reset()` and `sprite.maybeShake()` only when the card was not already open, and have `Alert.toggleMode()` call `sprite.reset()`, as in design.md ("`loopFrom`", reset points). Update the doc comments. Verify: `mise exec -- tools/lint.sh` passes (qmllint); `mise exec -- tests/run.sh --live --restart` passes; with `omarchy-shell ominous preview "angry playful"`, the current marine (no `loopFrom`) still jolts once on entering angry, then `omarchy-shell shell hide io.github.tuland.ominous`
- [x] 1.3 Document `loopFrom` in `docs/custom-themes.md` (key table: meaning, valid range, fallback to 0, intro replay on open, phase or mode change but not on a meeting update, the angry shake moving to the loop start). Change the 32x32 limit to 40x40 there and in the "User theme files" row of `docs/development.md`. In `docs/themes.md`, change "jolts ... once angry" to say a character jolts when it gets angry, or when its angry loop starts. Verify: `mise exec -- tests/run.sh --unit` passes (`tests/docs.test.mjs`); `grep -rn "32x32" docs` prints nothing about the limit
- [x] 1.4 In `Logic.normalizeSprite`, treat an empty frame list like a missing one (that phase has no sprite, the others keep theirs), so a theme with a frameless phase survives the second normalization in the card's payload. Change the "empty frame list" malformed case in `tests/themes.test.mjs` into a test that keeps the other phases' frames, before and after a JSON round trip through `normalizeTheme`. Verify: `mise exec -- tests/run.sh --unit` passes

## 2. Card layout

- [x] 2.1 Add `Logic.spriteTop(bandTop, bandBottom, spriteHeight, columnTop)` as in design.md ("Sprite placement and card height"), with typed JSDoc and an entry in the index at the top of `Logic.js`. Verify: unit tests cover a sprite shorter than the band (centred), a taller one (clamped to `columnTop`), and odd differences (whole pixels); `mise exec -- tests/run.sh --unit` passes
- [x] 2.2 In `Alert.qml`:
  - Set the content `Column` to `spacing: 0`. Give the `Text` items top padding, put a spacer `Item` before the button `Row`, and remove the countdown's bottom padding, as in design.md ("Column rhythm").
  - Place `PhaseSprite` with `Logic.spriteTop`, using the band from the title's top to the top of the spacer before the buttons.
  - Make the card height `max(content.implicitHeight, sprite bottom - content.y)` plus insets.
  - Color the caption with `root.textColor`.

  Verify:
  - `mise exec -- tools/lint.sh` passes, and `mise exec -- tests/run.sh --live --restart` passes.
  - Take `tools/shoot-card.sh` shots of `classic professional relaxed`, `marine playful relaxed` and `marine playful angry` with a three-line title. Say first that real alerts are held, and check that `holdSeconds` is 0 afterwards.
  - The shots show the sprite centred on the title-to-caption band and inside the card, the grouped spacing, and the caption in the title's color.
  - Tune the gaps on the shots, then show them to the user.

## 3. Marine drafts and the grid choice

- [x] 3.1 In `drafts/marine/`, pixelate relaxed and furious from the user's generated references at 40x40 and at 32x32 and let the user name the grid; then settle the base as in design.md ("Marine art", steps 1-2): headgear, build, realistic look, framing. Verify: `drafts/marine/010-grid-choice.png` read and shown to the user, who named 40x40; the accepted base `drafts/marine/017-s4.png` (all four expressions in `022-current-state.png`)
- [x] 3.2 Set `root.cell` in `Alert.qml` to `Math.max(3, Math.round(Style.space(N)))`, with N = 5 for 40x40 or 6 for 32x32. Record the choice and the reason in this change's design.md ("Cell size"). Verify: `mise exec -- tests/run.sh --live --restart` passes; a `tools/shoot-card.sh` shot of `shiba playful angry` shows its 16x16 sprite still crisp at the new cell
- [x] 3.3 Draw the remaining frames at the chosen grid, one sheet per phase checked with the user before the next:
  - tense: the standoff sequence in design.md (bust, a held close-up once, then the bust in a loop with `loopFrom` 8);
  - angry: the ignition and the loop in design.md (fire built in code, four fire tones with a pale yellow core, never white, never `urgent`; the laugh burst then the furious face burning).

  Save every approved frame as a native PNG, one pixel per cell, in `drafts/marine/frames/<phase>-<n>.png`. Verify: a sheet and a GIF per phase (`drafts/marine/024`-`048`), approved by the user; the native PNGs exist at 40x40 (relaxed 1, tense 12, angry 34)

## 4. Grids into the generator

- [x] 4.1 Write `drafts/marine/work/export.js` to the contract in design.md (step 4). It reads `drafts/marine/frames/*.png`: alpha 0 is `.`; alpha 255 must match one letter's RGB exactly, otherwise it fails naming the pixel; every letter has a distinct RGB. Run it to write `tools/art/marine/relaxed.txt`, `tense.txt` and `angry.txt`. Verify: the three files exist, with one letter per cell and blocks separated by one blank line; a scratch PNG with one off-palette pixel makes the exporter fail and name it
- [x] 4.2 In `tools/draw-themes.py`, add `read_grids(theme)` with the checks in design.md (step 5), including the 40x40 and 64-frame limits and equal sizes across phases, typed, with a Google docstring. Build `MARINE` from it, with its new palette, captions, `frameMs`, `shake` and the angry `loopFrom`. Update the module docstring: marine from grids, shiba and boss as coordinates. Regenerate `themes/marine.json` with `tools/draw-themes.py --show`, and read every frame as text. Verify: `mise exec -- tests/run.sh --unit` passes (art check, mypy); a scratch copy of a grid with a trailing space, an unknown letter, a short row or a 41-wide frame makes the script exit non-zero and name the file and line
- [x] 4.3 Update `tests/themes.test.mjs`: the marine at the chosen size, shiba and boss still 16x16, the marine angry with `loopFrom > 0` and `shake`, and angry still faster than tense. Verify: `mise exec -- tests/run.sh --unit` passes
- [x] 4.4 Check the marine on the card with `tools/shoot-card.sh marine playful <phase>` for each phase, with a short and a three-line title. Take several angry shots across the ignition and the loop, each with its own delay: `tools/shoot-card.sh` gains `OMINOUS_SHOOT_WAIT` (seconds from summon to capture, 1.6 by default), since every run opens a fresh card and its animation starts again. Say first that real alerts are held, and check that `holdSeconds` is 0 afterwards. Verify: the shots, read as images and shown to the user, show the bust centred on the title-to-caption band and inside the card, with the aura clear of the text

## 5. Performance and themes

- [x] 5.1 Measure the shell's CPU with `omarchy-shell ominous preview "angry playful"` held for 30 s, with the old marine and with the new one, as in design.md ("Performance check"). The old one is a copy of today's `themes/marine.json` (`git show HEAD:themes/marine.json`) placed in `~/.config/omarchy/ominous/themes/marine.json`; a file already there is moved aside to the scratchpad first. Measure the new marine after removing the copy and before putting the user's file back. Close the card with `omarchy-shell shell hide io.github.tuland.ominous`. Verify: both numbers are recorded in this change's design.md; the user themes folder is exactly as before (same file list, and `cmp` matches any file put back). If the new marine adds more than about 5% of one core, switch `components/PixelSprite.qml` to one `Canvas` behind the same properties; then `mise exec -- tools/lint.sh` and `mise exec -- tests/run.sh --live --restart` pass, and a `tools/shoot-card.sh` shot shows whole-pixel cells
- [x] 5.2 After asking the user, run `tests/theme-check.sh <scratchpad>/themes` under a light and a dark Omarchy theme, on the final renderer. Verify: the shots are read and shown to the user; the script restores the theme and says so

## 6. Art rules and docs

- [x] 6.1 Update `.claude/skills/ominous-theme/SKILL.md`:
  - the size limit becomes 40x40, and the cell size at scale 1 becomes the chosen 5 or 6 px (was 7);
  - "never a recognizable person" applies to the shipped art, while references in `drafts/` may show real people or be images the author generated (licenses unchanged);
  - a reference the author made may be pixelated into the shipped frames (palette, outline, defects fixed by hand); a third-party reference stays a guide only, and its pixelation is never a shipped frame;
  - generated references use flat frontal light and a flat saturated background, keyed out by color;
  - `loopFrom` gives an intro-then-loop animation, with the jolt at the loop start;
  - the marine is the first character drawn from grids.

  Update the theme rule in `CLAUDE.md` and the layout line on `tools/draw-themes.py` (marine from `tools/art/marine/`). Verify: `mise exec -- tests/run.sh --unit` passes (`tests/docs.test.mjs` on the skill); `grep -n "32x32\|7 screen pixels" .claude/skills/ominous-theme/SKILL.md CLAUDE.md` prints nothing stale
- [x] 6.2 Update `docs/development.md`, section "Drawing the shipped characters": the marine is drawn from `tools/art/marine/` through the reader in the script; shiba and boss are still coordinates; drop "until then nothing reads `tools/art/`". Update `docs/themes.md`: the marine's new look (bust, ignition, laugh loop), the reference rule as above, and the References section with the sources actually used for the shipped frames, taken from `drafts/marine/refs/SOURCES.tsv` (Wikimedia URLs, and one line for the author's generated images). Note in `docs/custom-themes.md` that sprite cells are now 5 or 6 px (was 7). Verify: `mise exec -- tests/run.sh --unit` passes; every URL listed is in `SOURCES.tsv` with a public domain or CC0 license

## 7. Integration

- [x] 7.1 Run `mise exec -- tests/run.sh --restart --refresh`. Say first that it shows a card that grabs the keyboard for about a minute. Verify: every check passes and `tests/results.log` has the new line; `omarchy-shell ominous status` shows `holdSeconds` 0

## 8. Review

- [x] 8.1 Code review and security review of this change's diff in a separate context: a fresh Cursor reviewer in a herdr pane, with a neutral brief (read-only, no network, no `gh` or `curl`, no shell experiments, what to read and the answer format only), plus `/code-review` and `/security-review`. Read it against the proposal, the spec delta, the design and the Security section of `docs/development.md`, with attention to `loopFrom` and the grid reader as untrusted-input paths. Check the reviewer's commands in its transcript afterwards. Fix the findings inside the change, and take decisions to the user

## Workflow follow-up

- Archive after the Review group is ticked. Add the user-visible items under `## [Unreleased]` in `CHANGELOG.md`: the redrawn marine, `loopFrom`, the 40x40 limit, the card layout and the caption color. Note there that shiba, boss and user themes are drawn smaller (5 or 6 px cells instead of 7).
- No release yet: it waits for the shiba and boss redraws. `preview.png` is regenerated then, with `tools/make-preview.sh`.
- Commit on `staging` when the user asks.
