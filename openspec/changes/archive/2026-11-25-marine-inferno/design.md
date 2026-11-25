# Design

## Context

See proposal.md for the motivation and specs/alert-themes/spec.md for the behavior. The
repository today:

- `Logic.normalizeSprite` caps frames at `MAX_SPRITE = 32` cells a side and `MAX_FRAMES = 64`.
  `Logic.normalizeTheme` keeps `frameMs` and `shake` for each phase, and `Logic.frameAt` picks
  a frame by index modulo the count.
- `components/PhaseSprite.qml` steps its frame with `(i + 1) % n` on a `Timer`. It resets to 0
  in `reset()` (card opened), `onPhaseChanged` and `onThemeChanged` (a mode switch hands it
  another theme). It jolts in `maybeShake()`, which runs on a phase change and right after the
  card opens, only for angry with `shake`.
- `components/PixelSprite.qml` draws one `Rectangle` per cell through a `Repeater`. Each
  cell's color is a binding on the grid.
- In `Alert.qml`:
  - the cell is `max(3, round(Style.space(7)))`;
  - the sprite sits at `content.y + titleText.y`, outside the content `Column`;
  - the card height is `content.implicitHeight` plus insets, so a sprite taller than the text
    would leave the card;
  - the `Column` uses one `spacing: Style.space(10)`;
  - the countdown has 8 px top and bottom padding;
  - the caption is colored `signalColor`.
- `tools/draw-themes.py` (standard library, typed, checked by mypy) draws every character as
  coordinates on `N = 16` and writes the theme JSON. `--check` runs in `tests/run.sh` and CI.
  `tests/themes.test.mjs` asserts the three shipped sprites are 16x16.
- `dev-art-tooling` defined, but did not implement, the grid files
  `tools/art/<theme>/<phase>.txt` and the exporter's pixel-to-letter rules (theme skill,
  "Redrawing a character").
- References and the pixelation tests from the explore session are in `drafts/marine/`, which
  git ignores:
  - `refs/` with `SOURCES.tsv`;
  - `work/pix.js`, `work/pix40.js`;
  - `003-pixel-test.png`, `004-40-zoom.png`.

## Goals / Non-Goals

**Goals:**

- One general mechanism, an intro played once and then a loop, that any theme can use. It is
  not special-cased for the marine.
- Every new decision stays a pure function in `Logic.js` with a unit test; the QML stays glue.
- The redrawn marine is tracked as text grids, read by the generator, never hand-edited JSON.
- The grid size, 40x40 or 32x32, is chosen by the user from hand-redrawn faces, not from raw
  pixelation.

**Non-Goals:**

- Redrawing shiba or boss: their own changes, in the same style, with their own escalation.
- A release, or a new `preview.png`: both wait until all three characters are redrawn.
- Changing professional mode beyond the shared column rhythm and caption color.
- A per-theme or derived cell size (see Decisions).

## Decisions

### `loopFrom`: normalized in Logic, stepped by one pure function

- `normalizeTheme` adds `loopFrom` to each phase. It keeps the raw value only when it is an
  integer with `0 <= loopFrom < frames.length`, and uses 0 otherwise. A string, a float or a
  negative is 0, as the spec scenario says.
- `Logic.nextFrame(index, count, loopFrom)` returns `index + 1`, or `loopFrom` after the last
  frame. `PhaseSprite`'s `Timer` uses it instead of `% n`.
- `Logic.frameAt` stays as it is.
- The reset points. The service's `follow()` calls `open()` again on an open card when the
  meeting's details change. `open()` then assigns `root.themes` from a payload that
  `normalizePayload` builds fresh each time, so `root.theme` is a new object even when nothing
  changed, and `PhaseSprite.onThemeChanged` sets the index to 0. Today that restarts the frames
  and jolts again; with an intro it would restart the ignition in the middle of the laugh.
  Three changes:
  - `onThemeChanged` rewinds only when `Logic.sameArt(before, after)` is false. That function
    compares the sprite size, the palette, and each phase's frames and `loopFrom`, and has a
    unit test for the equal case and the changed case. A real theme switch, such as a new file
    in the themes folder, still rewinds. The handler runs after the new theme is set, so
    `PhaseSprite` keeps the previous theme in a property of its own, and `sameArt(null, theme)`
    is false, so the first assignment starts at frame 0.
  - `Alert.toggleMode()` calls `sprite.reset()` itself, so switching mode replays the intro
    even when both modes use the same art.
  - `reset()` and the arrival jolt run in `Alert.open()` only when the card was not open
    before (`!root.opened` before `open()` sets it).

  A phase change still rewinds through `onPhaseChanged`. A second `open()` on an open card,
  with the same mode and the same art, leaves the index where it is.

Alternatives turned down:

- **A separate `intro` frame list per phase**: a second array to validate against the shared
  size and the 64-frame cap, and two timers' worth of state.
- **`loop: false` plus a hold on the last frame**: cannot express ignition-then-laugh.

### The jolt follows the loop start

`Logic.joltOnEnter(phase, spec)` is true when `phase === "angry" && shake && loopFrom === 0`.
`maybeShake()` uses it, so today's jolt on entry stays unchanged for themes without
`loopFrom`. `PhaseLook` has no phase name, so the caller passes it.

`Logic.joltOnStep(phase, spec, from, to)` is true when `phase === "angry" && shake && loopFrom
> 0 && to === loopFrom && from === loopFrom - 1`, that is, when the intro hands over to the loop. The `Timer` calls it on
every step, and `PhaseSprite` restarts its existing shake animation when it is true. With a
one-frame loop (`loopFrom === count - 1`) the frame never steps from the one before it again,
so the jolt fires once per intro. With a longer loop, the step into `loopFrom` comes from the
last frame, not from `loopFrom - 1`, so it fires once as well.

### Cell size: one fixed token, chosen with the grid

`root.cell` keeps its form `Math.max(3, Math.round(Style.space(N)))`, with N = 5 if 40x40
wins or N = 6 if 32x32 wins. Either way the marine is about 200 px at scale 1, it scales with the shell like
today, and every cell stays a whole number of pixels.

**Chosen: N = 5**, because the user picked the 40x40 grid (see "Marine art", step 2). The marine
is 200 px at scale 1. Shiba and boss, still 16x16, shrink from 112 px to 80 px until their own
redraws; no release comes in between.

Alternatives turned down:

- **Cell derived from the sprite**, for example `Style.space(200) / cols`: every theme would be
  the same size. But a user's small theme would turn into huge blocks, and today's documented
  7 px look for user themes would change silently.
- **Cell derived from the text height**: the face would change size from one meeting to the
  next (the design review raised this).
- **48x48 at 4 px**: the most detail, but a cell of 4 px no longer reads as pixel art next to
  the text, and every hand-drawn frame costs 2.25x a 32x32 one.

### Sprite placement and card height: one pure function

`Logic.spriteTop(bandTop, bandBottom, spriteHeight, columnTop)` returns
`max(columnTop, round(bandTop + (bandBottom - bandTop - spriteHeight) / 2))`.

- The band runs from the title's top to the bottom of the last visible line before the
  buttons (countdown, notice or caption). That bottom is the top of an always-visible spacer
  `Item` that holds the gap before the buttons (`Row` and the headline `Item` take no
  padding), so no gap is subtracted twice.
- `Alert.qml` reads all of these from the column's own children, in card coordinates.
- The card height becomes `max(content.implicitHeight, sprite bottom - content.y)` plus the
  insets.
- There is no binding loop: the sprite's position depends on the column, and the column never
  depends on the card height.

### Column rhythm: per-item top padding, spacing 0

The `Column` gets `spacing: 0`. Each `Text` carries its own top padding, so a hidden notice or
caption takes its gap with it. The countdown loses its bottom padding, and the notice and the
caption carry the small gap after it on their top. The gap under the headline is the title's
own top padding. Only the button `Row`, which takes no padding, gets its gap from a spacer
`Item` in front of it. Padding values at scale 1:

| Between | Padding |
|---|---|
| headline and title | 10 |
| title and time | 6 |
| time and countdown | 16 (on the countdown) |
| countdown and notice or caption | 4 |
| last text and buttons | 18, plus the countdown's unused descent (below) |
| buttons and hints | 6 |

**The countdown's unused descent.** The countdown's line box keeps the font's whole descent
(16.8 px at 56 px with JetBrains Mono), but "in 9:28" never reaches below the baseline, and the
"g" of "started 1:37 ago" uses only 10 px of it. Left in place, that space pushed the caption
about 24 px under the digits, the same distance as to the buttons, so the caption floated
between the two (31 px in angry, where the countdown is also shrunk to fit a column of about
500 px).
- `FontMetrics` on the countdown's font gives the descent and the ink of
  `Logic.countdownSample(started)` ("in 0:01", or "started 0:01 ago" once angry).
  `Logic.unusedDescent` turns them into whole pixels: 16 before the start, 6 once angry.
- The countdown's height drops by that much, and the spacer before the buttons grows by the same
  amount. The card's height never changes, and professional mode, which has no caption, keeps
  the same distance from the countdown to the buttons.
- The sample comes from the phase, not from the live text, so the layout changes in the same
  instant as the phase. The live text would change it a second later, when "now" turns into
  "started 0:01 ago".
- It works for any shell font and scale, and the "g" can never reach the caption.

Alternatives turned down, from the layout review: a fixed 12 px trim plus a 32 px spacer
(it depends on the font and on the font scale, which Omarchy sets apart from the spacing scale,
and it leaves the "g" about 3 px from the caption); a 32 px spacer alone (professional mode
then gets about 49 px under the countdown against 34 above it).

Measured on the shots, with a 29x29-cell placeholder of about 200 px:
- caption 10 px under the digits and 38 px above the buttons before the start;
- caption 15 px under the "g" and 29 px above the buttons once angry;
- professional: 35 px from the countdown to the buttons, as before;
- card heights unchanged;
- with a short title, the 200 px sprite ends 19 px above the buttons (15 px once angry).

These are layout only, not spec: the pixel values are tuned on shots, and the grouping alone
would be a weak requirement. Professional mode gets the same rhythm.

### Caption color

The caption uses `root.textColor`. The calendar notice keeps `signalColor`: it reports a
change the user must notice, not a joke.

### Marine art: drafts, then grids, then the generator

1. **Drafts.** All in `drafts/marine/`, untracked. Each step is one PNG sheet checked with the
   user before the next.
   - Headgear: pixelated side by side at card size, a bare head read as "tough guy" rather
     than soldier, and a beret read as military only while the vest showed (its badge is lost
     at 40 cells); the helmet read as a soldier even in a tight crop.
   - The base is `refs/ai-sheet-04` (the user's generated sheet: steel-pot helmet without chin
     straps, heavier build, flat light, blue background), one 400x365 crop per expression,
     the blue keyed out. The pipeline is `drafts/marine/work/hand/variants.js`: head top at
     row 4 and the bust cut by the bottom edge; each cell is the average of its pixels; greenish
     cells of the helmet and of the vest beside the neck are pushed to a clear olive (the face
     is never touched); one auto palette of about 20 tones; the `#1b1511` outline on the
     silhouette.
   - The look stays realistic. Rejected on the way, each at card size: a face drawn from
     imagination as text rows; a cartoon retouch (dark strokes for brows, eyes and a curved
     mouth read as a moustache, and the face looked gaunt); local contrast (CLAHE), which
     hollowed the cheeks and brought back the white rim-light stripes; a widened face, which
     stretched the ear light into grey stripes; a tapered bust and a redrawn neck and collar.
   - Hand edits fix named defects only (for example a grey cell on a cheek), one change per
     sheet, always next to the accepted version.
   - The aura stays in an outer border of about 4 cells around the helmet and the shoulder
     tops. The lower bust runs out to the side edges, as in the reference: the user prefers the
     bigger body this gives over a tapered bust (`drafts/marine/020-s4-shoulders.png`). The text
     stays clear through the card's `Style.space(24)` gap between the sprite and the text column.
   - Framing: no headroom except the aura, the bust cut by the bottom edge, the eyes near the
     upper third of the grid, and the head as large as the mouth and teeth need. The layout
     centres the sprite on the text band, so high eyes sit level with the title and time
     rather than with the gap before the countdown. The head is not shrunk to fit a third of
     the grid: that would lose the detail the 40x40 grid is for.
2. **Grid choice.** Relaxed and furious were pixelated at 40x40 and at 32x32 and shown side by
   side at card size (`drafts/marine/010-grid-choice.png`). The user picked 40x40: at 32x32 the
   eyes under the brim became two dark blots. The cell token follows (`Style.space(5)`).
3. **Frames.**
   - relaxed: 1 frame;
   - tense: 12 frames at 900 ms with `loopFrom` 8, a standoff cut once on entering the phase
     (advice from a design and film-editing reviewer, `drafts/marine/034`-`040`):
     - intro (frames 0-7): bust with the eyes to one side for two frames, then to the other
       side, then a square close-up of the face (brim to mouth) held for five frames, the eyes
       turning back and forth and a big sweat drop running down the temple. The cut keeps the
       gaze's direction (a match cut).
     - loop (frames 8-11): the bust only, the eyes glancing slowly, each picture held two
       frames so the small sweat drop does not blink. A long tense phase stays on the bust,
       recognisable at a glance, and angry starts from the same framing.
     - The bust's eyes are the photo's, with the white and the pupil swapped for the other
       side and the whites lifted out of the brim's shadow. The close-up's other gaze comes from
       `refs/ai-sheet-05` (the same face with the eyes turned): only the 19 eye cells whose
       colour changed are taken, so nothing else in the face moves between frames. Moving the
       eyes by hand in the close-up (mirroring cells) shifted skin cells and read as glitches.
     - The close-up has its own tones (about 18) beside the bust's; the theme palette is their
       union.
   - angry: 34 frames at 120 ms with `loopFrom` 10 and `shake`
     (`drafts/marine/045`-`048`):
     - ignition (frames 0-9, about 1.2 s, once) on the furious face: embers in the eyes, flames
       rising from the eyes with the first lapilli, then the aura catching at the shoulders and
       climbing to the helmet;
     - loop (frames 10-33, about 2.9 s): a burst of villain laughter (8 frames, the face of
       `refs/ai-sheet-04`, the head thrown back one row on each "ha"), where the jolt lands, then
       the furious face burning for 16 frames. The user asked for this: a glance must mostly
       find him angry, and a laugh seen alone reads as good humour.
     - 120 ms, not 250: a real flame flickers about ten times a second, and at 250 ms the fire
       stepped. Angry stays far faster than tense (900 ms).
   - The fire is built in code (`drafts/marine/work/hand/angry.js`), as the codixel skill asks
     for effects, never pixelated from a photo (a first try that sampled the fire of
     `refs/ai-fire-01` came out pale and flat): one value per cell from the shape (hot where it
     touches the silhouette, tongues further out, flames rising from the eyes) plus rising
     noise that loops over the 24 loop frames, cut into flat bands of the four fire tones
     (deep red tips, orange, yellow, a small pale yellow core; no dither, never white, never
     `urgent`); lapilli thrown up from the head and shoulders, cooling as they fall. The face
     under the fire is the furious or laughing base, unchanged.
4. **Exporter.** The chosen frames are saved as native PNGs, one pixel per cell, in
   `drafts/marine/frames/<phase>-<n>.png`. The card-size sheets and the GIF are for the eye
   only. `drafts/marine/work/export.js` reads the native PNGs and writes `tools/art/marine/<phase>.txt` under the
   contract: alpha 0 is `.`; alpha 255 must match one letter's RGB exactly; anything else fails
   and names the pixel; every letter has a distinct RGB. It stays a draft script, as
   `dev-art-tooling` decided. What it produces is checked on the tracked side.
5. **Reader.** `tools/draw-themes.py` gets `read_grids(theme, palette) -> dict[str, list[Frame]]`. It
   rejects anything outside the contract with a message naming the file and line:
   - a missing file or a missing final newline;
   - a blank line other than a single separator;
   - trailing spaces, or a letter not in the palette;
   - unequal rows or frame sizes, within a phase or across the three phases;
   - more than 40x40 cells, or more than 64 frames in a phase, so an oversized grid fails at
     `--check` instead of silently losing its sprite on the card.

   `MARINE` takes its frames from it, and keeps its palette, captions, `frameMs`, `shake` and
   `loopFrom` in the script. `N = 16` and the coordinate helpers stay for shiba and boss.
   `--check` covers the marine as before, through the generated JSON.

### References rule

- In `.claude/skills/ominous-theme/SKILL.md`, `docs/themes.md` and the theme rule in
  `CLAUDE.md`:
  - reference licenses stay CC0, public domain, or the author's own (including images the
    author generated);
  - "never a recognizable person" moves from the references to the shipped art: references in
    `drafts/` may show real people, since they never leave the drafts;
  - "a pixelated photo is never a shipped frame" keeps holding for third-party references, which
    stay a guide only; for a reference the author made (an own photo or a generated image), the
    shipped frames may start from its pixelation, reduced to the theme's palette and fixed by
    hand. Shipped art still must not resemble a recognizable person, character or mascot.
- The skill also says to ask for flat frontal light and a flat, saturated background in
  generated references, and to key the background out by color.
- `docs/themes.md` lists in its References section the sources actually used for the shipped
  frames. For the marine that is only the author's generated images (`ai-sheet-04` for the bust
  and the moods, `ai-sheet-05` for the eye turns), so no Wikimedia URL is listed: the Wikimedia
  photos in `SOURCES.tsv` were looked at in early drafts and the fire is drawn in code.

### Performance check

40x40 means 1600 `Rectangle`s, and each frame re-evaluates their color bindings. With
`omarchy-shell ominous preview "angry playful"` held for 30 s, the shell process's CPU (from
`pidstat`/`top`) is compared between the old and the new marine. The old one is today's
`themes/marine.json` copied to `~/.config/omarchy/ominous/themes/marine.json` as a user
override. Any file already there is first moved aside to a scratch folder. The new marine
is measured after the copy is removed and before the user's file is put back, since a user file
would hide the shipped theme. At the end the folder is exactly as it was. This runs before the light/dark theme check, so
that check sees the final renderer. If the extra load is
noticeable (more than about 5% of one core on average), `PixelSprite` switches to drawing each
frame on one `Canvas` (`fillRect` per cell, no smoothing) behind the same properties. Otherwise
it stays as it is.

Measured on 2026-11-25 (utime + stime of the shell process from `/proc`, 30 s each, two 1x
monitors):

| Shell state | CPU, % of one core |
|---|---|
| idle, no card | 2.7 |
| old marine (16x16, 256 `Rectangle`s), angry | 5.7 |
| new marine (40x40, 1600 `Rectangle`s, 120 ms frames), angry | 15.9 |
| new marine on one `Canvas`, angry | 6.7 |

The `Rectangle`s added about 10% of one core, so `PixelSprite` is now one `Canvas`. A run of
same-colored cells in a row is one `fillRect`; the colors resolve in one binding that reads the
shell theme, so role colors still follow it and a change repaints. A relaxed card shot is
pixel-identical to the `Rectangle` one, and every 5x5 cell of the sprite is one color.

## Risks / Trade-offs

- [Shiba and boss shrink on the card (16 cells at 5-6 px) until they are redrawn] → no release
  in between; their changes come next.
- [The hand redraw takes many rounds] → short loops with one sheet per question. The grid
  choice comes first, so frames are not drawn twice at full count.
- [A user theme with `loopFrom` and `shake` outside angry] → the shake stays angry-only, as
  today, and `loopFrom` works in every phase.
- [The reference images resemble a real person or an existing armor] → the frames are redrawn
  by hand, the vest is original (rounded pads, "07", no high collar), and the final art is
  checked against the rule before export.
- [`Canvas` fallback differs on HiDPI] → it is only used if the measurement asks for it.
  Whole-pixel cells are then rechecked with `tools/shoot-card.sh` at the user's scale.

## Migration Plan

User themes keep working: `loopFrom` is optional, and existing sprites up to 32x32 stay valid.
User sprites get smaller on the card with the new cell token (5 or 6 px instead of 7).
`docs/custom-themes.md` says so. Rollback is a revert: no config or state format changes.
