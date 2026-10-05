import QtQuick
import qs.Commons

// A thin bar: a faint track and a fill of `fraction` (0..1) in `fillColor`.
// With `animated` the fill moves linearly over one 250 ms clock tick, so it
// looks continuous; turn it off while a card opens so it does not sweep in.
Rectangle {
  id: line

  property real fraction: 0
  property color fillColor: Color.accent
  property color trackColor: Util.alpha(Color.foreground, 0.12)
  property bool animated: true

  height: Math.max(2, Style.space(3))
  radius: height / 2
  color: line.trackColor

  Rectangle {
    width: line.width * line.fraction
    height: parent.height
    radius: parent.radius
    color: line.fillColor
    Behavior on width { enabled: line.animated; NumberAnimation { duration: 250 } }
  }
}
