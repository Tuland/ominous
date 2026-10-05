import QtQuick
import "../Logic.js" as Logic

/**
 * A theme's character for the current phase: cycles the phase's frames, jolts once when the
 * meeting starts (if the theme asks), and fades out when the phase has no art, still showing
 * its last frame instead of vanishing mid-fade.
 *
 * In: `theme` (normalized), `phase`, `running` (the card is open), `cell` (pixel size).
 * Out: `hasArt`, for the card to make room; reset() and maybeShake() for the card to call.
 */
Item {
  id: sprite

  property var theme: Logic.normalizeTheme({})
  property string phase: "relaxed"
  property bool running: false
  property int cell: 6

  readonly property var spec: sprite.theme.phases[sprite.phase]
  readonly property bool hasArt: sprite.theme.cols > 0 && sprite.spec.frames.length > 0

  property int frameIndex: 0
  property real shakeX: 0
  readonly property var rows: sprite.hasArt ? Logic.frameAt(sprite.spec.frames, sprite.frameIndex) : null
  property var shown: ({ cols: 0, rows: 0, palette: ({}), grid: [] })

  width: sprite.theme.cols * sprite.cell
  height: sprite.theme.rows * sprite.cell

  onRowsChanged: if (sprite.rows) sprite.shown = { cols: sprite.theme.cols, rows: sprite.theme.rows, palette: sprite.theme.palette, grid: sprite.rows }
  onPhaseChanged: { sprite.frameIndex = 0; sprite.maybeShake() }
  onThemeChanged: sprite.frameIndex = 0

  /** For a card that just opened: start from the first frame, no leftover jolt. */
  function reset(): void {
    shake.stop()
    sprite.shakeX = 0
    sprite.frameIndex = 0
  }

  /** Jolts once, if the card is open, angry, and the theme asks for it. */
  function maybeShake(): void {
    if (sprite.running && sprite.phase === "angry" && sprite.hasArt && sprite.spec.shake) shake.restart()
  }

  // One sideways jolt: four 40 ms steps of one cell.
  SequentialAnimation {
    id: shake
    NumberAnimation { target: sprite; property: "shakeX"; to: sprite.cell; duration: 40 }
    NumberAnimation { target: sprite; property: "shakeX"; to: -sprite.cell; duration: 40 }
    NumberAnimation { target: sprite; property: "shakeX"; to: sprite.cell; duration: 40 }
    NumberAnimation { target: sprite; property: "shakeX"; to: 0; duration: 40 }
  }

  Timer {
    interval: sprite.spec.frameMs
    running: sprite.running && sprite.hasArt && sprite.spec.frames.length > 1
    repeat: true
    onTriggered: sprite.frameIndex = (sprite.frameIndex + 1) % sprite.spec.frames.length
  }

  PixelSprite {
    x: sprite.shakeX
    cols: sprite.shown.cols
    rows: sprite.shown.rows
    colors: sprite.shown.palette
    grid: sprite.shown.grid
    cell: sprite.cell
    opacity: sprite.hasArt ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
  }
}
