pragma ComponentBehavior: Bound

import QtQuick
import qs.Commons

/**
 * Draws one frame of pixel art. Every cell is a whole-pixel square with no smoothing, so the
 * art stays crisp.
 *
 * In: `grid`, a list of equal-length text rows; `colors`, each character to a color token (an
 * Omarchy role or hex); `cols`, `rows`; `cell`, the size of one pixel.
 * Out: nothing; it only draws.
 */
Item {
  id: px

  property int cols: 0
  property int rows: 0
  property var colors: ({})
  property var grid: []
  property int cell: 6

  width: px.cols * px.cell
  height: px.rows * px.cell

  Repeater {
    model: px.cols * px.rows

    Rectangle {
      id: pixel

      required property int index
      x: (pixel.index % px.cols) * px.cell
      y: Math.floor(pixel.index / px.cols) * px.cell
      width: px.cell
      height: px.cell
      antialiasing: false
      // Characters `colors` does not know are transparent. Tokens resolve
      // here, so role colors follow the shell theme as it changes.
      color: {
        var row = px.grid[Math.floor(pixel.index / px.cols)]
        var token = row ? px.colors[row.charAt(pixel.index % px.cols)] : undefined
        return token ? Color.flatColor(token, "transparent") : "transparent"
      }
    }
  }
}
