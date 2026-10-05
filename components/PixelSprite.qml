import QtQuick
import qs.Commons

// Draws one frame of pixel art: `grid` is a list of equal-length text rows and
// `palette` maps each character to a color token (an Omarchy role or hex).
// Every cell is a whole-pixel square with no smoothing, so the art stays crisp.
Item {
  id: px

  property int cols: 0
  property int rows: 0
  property var palette: ({})
  property var grid: []
  property int cell: 6

  width: px.cols * px.cell
  height: px.rows * px.cell

  Repeater {
    model: px.cols * px.rows

    Rectangle {
      required property int index
      x: (index % px.cols) * px.cell
      y: Math.floor(index / px.cols) * px.cell
      width: px.cell
      height: px.cell
      antialiasing: false
      // Characters the palette does not know are transparent. Tokens resolve
      // here, so role colors follow the shell theme as it changes.
      color: {
        var row = px.grid[Math.floor(index / px.cols)]
        var token = row ? px.palette[row.charAt(index % px.cols)] : undefined
        return token ? Color.flatColor(token, "transparent") : "transparent"
      }
    }
  }
}
