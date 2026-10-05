# Design

## Context

See `proposal.md` for the motivation and the specs for the required behavior.

Today, `Service.qml` reads `ominous.json`, polls OmaCal and summons the overlay with a JSON
payload. `Alert.qml` renders that payload and keeps one bit of time-driven state: `started`.
`started` switches the signal color from `Color.accent` to `Color.urgent`. The overlay receives
only `shell` and `manifest`, so it cannot call the service directly. The two halves can share
files, however, and the shell's own notifications service already does this: it creates a
directory with `mkdir -p` in a `Process`, then saves a state file through a `FileView` with
`atomicWrites: true`.

The shell UI kit (`/usr/share/omarchy/shell/Ui`) provides `ToggleSwitch`, which has a
settable `trackHeight` for compact placements. `Color.flatColor(token, fallback)` already
resolves palette-role tokens (`accent`, `urgent`, `foreground`, `muted`, `background`) and hex
colors. The shell animates with short eased transitions, for example 140 ms `OutCubic` in the
OSD.

## Goals / Non-Goals

**Goals:**
- All new decision logic lives in `Logic.js` and is checked by node: phases, progress
  fractions, config keys, theme validation.
- Themes are plain JSON files: no binary assets and no QML per theme.
- The look matches the Omarchy kit. The plugin reuses `ToggleSwitch`, `Style` and `Color`,
  and every sprite follows the active Omarchy palette.
- Each half has a single owner. The service reads config and themes. The overlay is the only
  writer of the state file.

**Non-Goals:**
- PNG or other image sprites.
- Escalation levels inside the angry phase.
- A theme editor or a sprite preview tool.
- Sound.
- Writing to `ominous.json`.

## Decisions

### Data flow

```
 ominous.json --+                          state.json (mode)
                |                            ^        |
                v                            | write  | watch
 themes/*.json --> Service.qml --summon--> Alert.qml  |
 (user, then        loads + validates        renders, |
  built-in)         both themes, mode        toggles  |
                    <---------------------------------+
```

The service resolves both themes up front: the one for professional mode and the one for
playful mode. Both go into the payload as validated objects, together with `mode`,
`leadSeconds` and `tenseSeconds`. With both themes on hand, the overlay can toggle on the open
card with no round trip.

On a toggle, the overlay writes `{"mode": "..."}` to `~/.local/state/ominous/state.json`. The
service watches that file, so the next payload and `status` reflect the new mode.

- *Alternative: the overlay loads the themes itself.* Rejected. Theme errors would not reach
  `status`, and loading would be repeated on every summon.
- *Alternative: the switch writes `ominous.json`.* Rejected. The plugin would reformat a file
  the user edits by hand, and comments or key order could be lost.

### Logic.js additions

These are pure functions, so node tests can run them:
- `phase(startMs, nowMs, tenseSeconds)` returns `"relaxed" | "tense" | "angry"`, with the
  boundaries given in the alert-phases spec.
- `progress(startMs, endMs, nowMs, leadSeconds)` returns a fill from 0 to 1. Before the start
  it measures the lead window. After the start it measures the meeting. With no end, or with a
  lead of 0, it returns 1.
- `normalizeConfig` grows to accept:
  - `tenseSeconds`: an integer from 0 to 3600, default 15;
  - `mode`: `professional` or `playful`, default `professional`;
  - `themes.professional` and `themes.playful`.

  A theme name must match `^[a-z0-9_-]{1,40}$` or the default is used. The name becomes part
  of a file path, so this check blocks path traversal.
- `normalizeTheme(raw)` returns a clean theme or `null` (reading as JSON failed). Missing
  phase colors stay unset, and the overlay applies the per-phase defaults. A sprite is
  dropped when any of these holds:
  - frames have different sizes;
  - rows have different lengths;
  - the size exceeds 32x32;
  - a palette key is longer than one character.

  `frameMs` is clamped to the 80–5000 ms range. Captions are coerced to strings and capped at
  80 characters.
- `resolveMode(stateRaw, cfg)`: a valid saved mode wins over `cfg.mode`.
- The Service-to-Alert contract is pure too, so a round-trip test can pin it: `eventPayload`,
  `look`, `normalizePayload` (the overlay re-checks every field), `previewPayload` (the
  `preview` IPC), `statusSnapshot` (counts and times, never titles), `frameAt`, `pickTheme`.
  The QML files only wire these to the shell.

### Theme lookup

The service uses one `FileView` per mode. Its path is first
`~/.config/omarchy/ominous/themes/<name>.json`. On `onLoadFailed` it switches to the
plugin's `themes/<name>.json`, resolved with `Qt.resolvedUrl`. If that also fails, or the
JSON is invalid, it loads the built-in default for the mode and sets `themeError`. `status`
reports `themeError` in its own field. `lastError` is cleared on every agenda fetch, so it
cannot carry theme errors. Both user paths are watched, so editing a theme takes effect at
the next alert.

### Theme commands

`themes` and `theme` are IPC functions on the service. The theme choice goes to its own file,
`~/.local/state/ominous/themes.json`, written only by the service. `state.json` keeps the mode
and is written only by the overlay. With one writer per file, neither can overwrite the other's
change, and no merge logic is needed.

- *Alternative: one state file holding both mode and themes.* Rejected. The overlay and the
  service would both write it, and each write would have to read and merge the other's part.

Precedence is the same as for the mode: a valid saved choice wins over `ominous.json`, and
`theme reset` removes it. Deciding what a command means (`themeCommand`), the catalog of
available themes (`themeCatalog`), the listing text (`formatThemeList`) and the effective theme
names (`resolveThemes`) are pure functions in `Logic.js`. The service lists both theme
directories with `FolderListModel`, which follows file changes on its own.

### Colors

The overlay resolves every color token with `Color.flatColor`, so the colors follow Omarchy
theme swaps through the bindings that already exist. The default phase colors are:

| Phase | Default color |
|---|---|
| relaxed | `Color.accent` |
| tense | `Qt.tint(Color.accent, Util.alpha(Color.urgent, 0.5))` |
| angry | `Color.urgent` |

The palette has no warning or yellow role, and a blend stays coherent with every Omarchy
theme. `signalColor` gets a `ColorAnimation` of about 300 ms.

### Sprite rendering

The sprite is a `Grid` of `Repeater` `Rectangle`s, one per cell, at most 1024. Each cell's
color binds to the current frame's character through the palette, so palette roles re-resolve
on their own when the Omarchy theme changes. The cell size is an integer:
`Math.max(3, Math.round(Style.space(6)))`. A 16x16 sprite is about 96 px at the default scale.
The grid has `antialiasing: false` and an integer position, so edges stay crisp.

- *Alternative: a `Canvas`.* Rejected. It would need explicit repaints on frame changes and on
  theme changes, which is more imperative code for no visual gain.

### Animation

All animation stays inside the sprite and the signal color. The card never flashes.
- A `Timer` advances the frame index every `frameMs`. It runs only when the phase has more
  than one frame and the card is open.
- The frame index resets on every phase change.
- When the phase becomes angry and the theme sets `shake`, a `SequentialAnimation` nudges the
  sprite's x by ±1 cell, 4 steps of 40 ms each. It plays once.
- The built-in playful themes use these values:

| Phase | Frames | frameMs | Shake |
|---|---|---|---|
| relaxed | 1 | – | – |
| tense | 2 | ~900 ms | – |
| angry | 2–3 | ~250 ms | on entry |

### Layout

The text column width is the one the card has today:
`min(Style.space(560), panel.width - Style.gapsOut * 8)` minus the insets. When the current
phase has a sprite, the card adds the sprite width plus `Style.space(24)` on the left. The
card's `width` has a `Behavior` with a `NumberAnimation` of about 180 ms `OutCubic`. The card
stays centered, so it grows on both sides.

The caption sits below the countdown, at `Style.font.title`, in the signal color, as plain
text, on one line, elided. The existing "MEETING · calendar" label stays as it is.

```
+-----------------------------------------------------+
| +----------+  MEETING . work                   [o-] |
| |  sprite  |  Weekly sync                           |
| | 16x16 xN |  10:00 - 10:30   Room 4                |
| +----------+  in 0:08                               |
|               much soon. wow.                       |
|               [ Join on Meet ]  [ Dismiss ]         |
|               <- -> choose   Enter confirm   Esc    |
|=========================================------------| <- progress (if enabled)
+-----------------------------------------------------+
```

### Mode switch

The switch is a `ToggleSwitch` with `trackHeight` close to the caption line height. It
anchors top-right in the card's padding, on the label row. At rest it has opacity 0.45 and
goes to 1 on hover; the opacity animates. It is not a child of the Join/Dismiss cycle. The key
catcher maps `Qt.Key_M` to the toggle, after the input-guard check.

On a toggle, the overlay updates its local `mode` at once and starts the save:
`mkdir -p ~/.local/state/ominous` through a `Process`, then `FileView.setText` with
`atomicWrites`. `onSaveFailed` logs `ominous: could not save mode`.

### Progress bar

The bar is a `Rectangle` 3 px high, `Math.max(2, Style.space(3))`, anchored to the bottom
edge inside the `BorderSurface` content area. Its width is the card's inner width times
`Logic.progress(...)`, with a short `Behavior` so the 250 ms clock ticks look smooth. The bar
takes no layout space.

### Built-in art

- `marine`: an original helmeted face drawn on a 16x16 grid:
  - relaxed: calm, one frame;
  - tense: eyes darting left and right, two frames;
  - angry: teeth bared, red-tinted, three frames.

  Captions: "All clear." / "Incoming." / "YOU ARE LATE."
- `shiba`: an original shiba head on 16x16:
  - relaxed: content, one frame;
  - tense: wide eyes and a sweat drop, two frames;
  - angry: snarl and raised fur, three frames.

  Captions: "such calm. very agenda." / "much soon. wow." / "very late. so meeting."

- `boss`: an original executive, slicked hair, suit and tie, on 16x16:
  - relaxed: pleased with himself, heavy lids and a smirk, one frame;
  - tense: eyes darting and a sweat drop, two frames;
  - angry: red face, a scowl (corners down) or a yelling open mouth, no teeth, steam from the
    ears, three frames.

  The tie uses the `accent` role, and `urgent` when angry. Captions: "Let's circle back." /
  "Can you see my screen?" / "Per my last email."

The palettes use roles wherever they make sense: outline = `background`, highlight =
`foreground`, blood or anger = `urgent`. Fixed hex colors are used only for skin and fur
tones. Every grid is drawn from scratch, without tracing any game or meme asset. The README
credits only the idea ("a nod to 90s FPS status-bar faces and the doge meme"), with no
trademarks in theme names or file names.

### Code organization

The layout follows the shell's own plugins. Entry QML files are at the top level and there is one
pure logic file, as with `NotificationLogic.js`. Pieces live in `components/`, as with
`notifications/components/`.

- `Logic.js` stays one file, indexed by section. The shell's plugins never import one JS file into
  another, and splitting it would need a module loader for the node tests.
- Components take explicit properties and emit signals; none reads the file that uses it.
  `PhaseSprite` owns the frame timer and the jolt, so `Alert.qml` keeps only layout and wiring.
- The shipped playful themes are generated by `tools/draw-themes.py`, kept in the repo, and
  `tests/run.sh` checks the JSON against it.

## Risks / Trade-offs

- [Hand-drawn 16x16 art may look amateurish] → Each sprite gets several review passes with
  `omarchy-shell ominous test`, which shows all three phases within 60 s. The palette keeps
  4–6 colors.
- [A large payload on every summon, with two themes and their frames] → A few KB of JSON once
  per alert. Acceptable.
- [Fixed skin and fur hex colors can clash with light Omarchy themes] → They are limited to
  the face fill. The outline and accents use roles, so contrast follows the theme.
- [The service and the overlay both touch `state.json`] → Only the overlay writes it, and the
  write is atomic. The service only reads it.
- [The `M` key could be pressed while the user is typing elsewhere] → The input guard covers
  the first second, and a toggle is harmless and reversible: it never joins or dismisses.
- [Character likeness or trademark concerns] → Characters are original, names are generic, and
  the credits mention ideas only. If a concern is raised, the theme can be replaced without
  touching code.

## Migration Plan

This is a purely additive change. With an untouched `ominous.json` and no state file, the
alert opens in professional mode with `classic`. The only differences from today are the tense
color and the progress bar. Rollback is a revert. `state.json` can stay behind, because older
code ignores it.
