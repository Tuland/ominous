# Tasks

## 1. Phase and config logic

- [x] 1.1 Add `Logic.phase(startMs, nowMs, tenseSeconds)` and verify node tests cover the relaxed/tense/angry boundaries, a late open, `tenseSeconds` greater than the lead time, and `tenseSeconds` 0
- [x] 1.2 Add `Logic.progress(startMs, endMs, nowMs, leadSeconds)` and verify tests cover the lead-window fill, the meeting fill, no end time, lead 0 and clamping
- [x] 1.3 Extend `normalizeConfig` with `tenseSeconds`, `mode`, `themes.professional` and `themes.playful` (theme names restricted to `^[a-z0-9_-]{1,40}$`). Verify tests cover the defaults, invalid values and a traversal name such as `../x`
- [x] 1.4 Add `Logic.resolveMode(stateRaw, cfg)` and verify tests show that a valid saved mode wins and that a missing or garbage state falls back to `cfg.mode`

## 2. Theme format and built-in classic theme

- [x] 2.1 Add `Logic.normalizeTheme(raw)`: phase colors, captions (string, capped at 80 characters), `progress`, `shake`, `frameMs` clamped to 80–5000 ms, and sprite validation (equal frame sizes, equal row lengths, at most 32x32, single-character palette keys). Verify tests show that a malformed sprite is dropped while colors and captions survive
- [x] 2.2 Create `themes/classic.json` (no sprite, no captions, `progress: true`) and verify a node test loads every `themes/*.json` through `normalizeTheme` without errors
- [x] 2.3 Document the theme file format, the lookup order (user directory, then built-in) and the color tokens in `README.md`. Verify the README example is valid JSON that `normalizeTheme` accepts

## 3. Service: config, themes, state

- [x] 3.1 Load the theme for each mode in `Service.qml` (user path first, built-in on load failure, default theme for the mode as a last resort) and track `themeError`. Verify `omarchy-shell ominous status` shows `themeError` for a nonexistent `themes.playful` name, and nothing once the name is fixed
- [x] 3.2 Watch `~/.local/state/ominous/state.json` and resolve the mode with `Logic.resolveMode`. Verify that editing the file by hand changes `mode` in `status`
- [x] 3.3 Add `mode`, `leadSeconds`, `tenseSeconds` and both resolved themes to the payload, in both `payloadFor` and the `test` IPC. Add `mode`, the theme names and `themeError` to `status`. Verify `status` prints them and no meeting title
- [x] 3.4 Document `tenseSeconds`, `mode`, `themes` and the state file (including "delete it to reset") in the README configuration table. Verify the documented keys match `normalizeConfig`

## 4. Alert: phases in professional mode

- [x] 4.1 Replace `started`-driven `signalColor` with phase colors resolved through `Color.flatColor`, with the per-phase defaults (tense = accent tinted toward urgent) and a ColorAnimation of about 300 ms. Verify with `omarchy restart shell && omarchy-shell ominous test` that the countdown goes accent, then the blend at T-15 s, then urgent at T0, with smooth transitions
- [x] 4.2 Add the 3 px progress bar on the card's bottom edge, driven by `Logic.progress`, shown only when the theme enables it. Verify in the test alert that it fills toward T0, restarts at T0 for the meeting in urgent, and does not change the card's height

## 5. Alert: mode switch and persistence

- [x] 5.1 Add a compact `Ui/ToggleSwitch` at the top right (opacity 0.45 at rest, 1 on hover), plus the `M` key behind the input guard, outside the Tab cycle. Verify in the test alert that Tab moves only between Join and Dismiss, that `M` within the first second does nothing, and that a toggle keeps the selected button
- [x] 5.2 Save the mode on toggle (`mkdir -p` Process, then a FileView with `atomicWrites`; `onSaveFailed` logs). Verify that after a toggle `state.json` holds the new mode, `ominous.json` is unchanged (compare checksums), and the next `ominous test` after `omarchy restart shell` opens in that mode

## 6. Alert: sprites, captions, playful layout

- [x] 6.1 Render the sprite as a Grid/Repeater of Rectangles with an integer cell size, `antialiasing: false` and palette tokens resolved through `Color.flatColor`. Verify with a temporary user theme that cells are crisp and that switching the Omarchy theme recolors role-based cells
- [x] 6.2 Add the frame Timer (runs only with more than one frame and the card open; the index resets on each phase change) and the one-shot angry shake. Verify in the test alert: still in relaxed, slow cycling in tense, fast cycling plus one shake at T0
- [x] 6.3 Add the caption under the countdown (plain text, one line, elided, signal color). Verify that a long caption elides and that markup such as `<b>x</b>` shows literally
- [x] 6.4 Add the playful layout: the sprite on the left, the card width animated, the text column width unchanged. Verify that toggling on an open test card widens it smoothly and that the title wraps identically in both modes

## 7. Built-in playful themes

- [x] 7.1 Draw `themes/marine.json`: an original 16x16 helmeted face, 3 expressions (1/2/3 frames), captions "All clear." / "Incoming." / "YOU ARE LATE.", `shake` on angry, palette mostly role-based. Verify that the node theme test passes and that it looks right through a full `ominous test` cycle on a dark and a light Omarchy theme
- [x] 7.2 Draw `themes/shiba.json`: an original 16x16 shiba, 3 expressions, doge-style captions ("such calm. very agenda." / "much soon. wow." / "very late. so meeting."). Verify the same way as 7.1
- [x] 7.3 Add the README section on themes with a preview description and the credits line ("a nod to 90s FPS status-bar faces and the doge meme"; all art original). Verify the README has no third-party names in theme or file names, and `grep -ri doom themes/` finds nothing

## 8. Integration check

- [x] 8.1 Run `tests/run.sh --restart --keys` (unit + live, after a shell restart) and `tests/theme-check.sh`, which show each mode with each built-in theme. Verify all three phases, the switch, persistence across a restart and `status`, and that a broken user theme falls back without blocking the alert

## 9. Test suite

- [x] 9.1 Convert `tests/logic.test.mjs` to `node:test` (named tests, all failures reported) and verify `node --test tests/` passes
- [x] 9.2 Move the decisions that lived in QML, new and pre-existing, into `Logic.js` (`eventPayload`, `look`, `normalizePayload`, `previewPayload`, `statusSnapshot`, `frameAt`, `parseConfig`, `claimDue`, `pruneFired`, `isGuarded`, `isOver`, `initialSelection`, `nextSelection`, `activation`) with unit tests, including a Service-to-Alert round trip and a "status never has a title" check. Verify by breaking each function on purpose and seeing a test fail
- [x] 9.3 Add `tests/live.sh`: IPC checks on the running shell (status, saved mode, user themes, `preview` for every phase and mode, long title, optional `--keys`) that restore the user's state file and themes on exit. Verify it passes twice in a row and leaves `ominous.json`, the state file and the themes folder as they were
- [x] 9.4 Add `tests/run.sh` (unit + live in one command) that appends one line per run to `tests/results.log` (git-ignored) and verify the line records date, commit, counts and failures
- [x] 9.5 Add `tests/theme-check.sh`: snapshot the Omarchy theme state, show the card under a light and a dark theme (palette only, headless), then restore byte for byte and diff a manifest. Verify it ends with `PASS everything is back as it was` and that the theme, background and `theme.name` are unchanged

## 10. Theme commands

- [x] 10.1 Add `themeCatalog`, `formatThemeList`, `parseThemeOverrides`, `resolveThemes` and `themeCommand` to `Logic.js`, with unit tests for listing, choosing, the default mode, unknown and invalid names, reset, and precedence over `ominous.json`. Verify by breaking each function on purpose and seeing a test fail
- [x] 10.2 Wire the `themes` and `theme` IPC functions in `Service.qml`: list both theme directories with `FolderListModel`, save to and watch `themes.json`, use the effective names for the theme slots and for `status`. Verify with `omarchy-shell ominous themes` and `theme shiba` that `status` shows `shiba` for playful
- [x] 10.3 Extend `tests/live.sh`: listing, switching to shiba, an unknown name, reset; `themes.json` is restored on exit and `ominous.json` is unchanged. Verify `tests/run.sh --restart --keys` passes
- [x] 10.4 Document `themes`, `theme` and `themes.json` in the README and `CLAUDE.md`. Verify the README's commands match the IPC functions

## 11. Boss theme

- [x] 11.1 Draw `themes/boss.json`: an original 16x16 executive in suit and tie, 3 expressions (1/2/3 frames), captions "Let's circle back." / "Can you see my screen?" / "Per my last email.", the tie on the `accent` role (`urgent` when angry), `shake` on angry. Verify the unit tests for shipped themes cover it and `omarchy-shell ominous theme boss` with `preview` shows all three phases
- [x] 11.2 Update the spec's built-in themes, the design's art notes and the README table. Verify `openspec validate --strict` and the README test pass

## 12. Code organization

- [x] 12.1 Reorder `Logic.js` by concern with an index at the top, without changing any function. Verify every exported name and function body is identical before and after, and the unit tests pass
- [x] 12.2 Split the unit tests into one file per concern sharing `tests/helpers.mjs`. Verify the same 76 tests pass
- [x] 12.3 Move the card's and the service's reusable pieces into `components/` (`ActionButton`, `ModeSwitch`, `ProgressLine`, `PixelSprite`, `PhaseSprite`, `ThemeSlot`, `ThemeFile`) with explicit properties instead of reaching into `root`. Verify no QML errors in the shell log, `tests/run.sh --keys` passes, and screenshots match the earlier look
- [x] 12.4 Keep the sprite generator in the repo as `tools/draw-themes.py` with `--check`, run by `tests/run.sh`. Verify `--check` passes on the committed themes and fails after a hand edit to one
- [x] 12.5 Update `CLAUDE.md` (layout, art rule, checking) and the README. Verify the documented commands exist

## 13. Documentation in docs/

- [x] 13.1 Keep the README to what Ominous is, install, a one-minute try and an index; move the rest to `docs/` (`usage.md`, `themes.md`, `configuration.md`, `custom-themes.md`, `development.md`). Verify nothing documented before is lost
- [x] 13.2 Replace the README test with `tests/docs.test.mjs`: the index covers every page, every local link resolves, config keys, the theme example, every IPC command and every shipped theme are documented. Verify by removing a link, a key and a command on purpose and seeing a test fail each time

