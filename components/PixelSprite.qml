pragma ComponentBehavior: Bound

import QtQuick
import qs.Commons

/**
 * Draws one frame of pixel art on one Canvas. Every cell is a whole-pixel square with no
 * smoothing, so the art stays crisp. A run of same-colored cells in a row is one `fillRect`:
 * a 40x40 frame is a few hundred rectangles painted in one pass, not 1600 items to update.
 *
 * In: `grid`, a list of equal-length text rows; `colors`, each character to a color token (an
 * Omarchy role or hex); `cols`, `rows`; `cell`, the size of one pixel.
 * Out: nothing; it only draws.
 */
Canvas {
  id: px

  property int cols: 0
  property int rows: 0
  property var colors: ({})
  property var grid: []
  property int cell: 6
  // Each character to its color. Tokens resolve in this binding, which reads the shell theme,
  // so role colors follow the theme as it changes and the frame repaints.
  readonly property var resolved: {
    const m = {}
    for (const k in px.colors) m[k] = Color.flatColor(px.colors[k], "transparent")
    return m
  }

  width: px.cols * px.cell
  height: px.rows * px.cell
  antialiasing: false
  smooth: false

  onGridChanged: px.requestPaint()
  onResolvedChanged: px.requestPaint()
  onWidthChanged: px.requestPaint()
  onHeightChanged: px.requestPaint()

  // Characters `colors` does not know are left transparent.
  onPaint: {
    const ctx = px.getContext("2d")
    ctx.clearRect(0, 0, px.width, px.height)
    for (let y = 0; y < px.rows; y++) {
      const row = px.grid[y] || ""
      let x = 0
      while (x < px.cols) {
        const ch = row.charAt(x)
        let end = x + 1
        while (end < px.cols && row.charAt(end) === ch) end++
        const c = px.resolved[ch]
        if (c) {
          ctx.fillStyle = c
          ctx.fillRect(x * px.cell, y * px.cell, (end - x) * px.cell, px.cell)
        }
        x = end
      }
    }
  }
}
