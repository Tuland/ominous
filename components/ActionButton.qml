import QtQuick
import qs.Commons

/**
 * One of the card's two buttons.
 *
 * In: `label`; `current`, the keyboard selection; the colors.
 * Out: `activated()` on a click; the card decides whether its input guard lets it through.
 */
Rectangle {
  id: btn

  property string label: ""
  property bool current: false
  property color accent: Color.accent
  property color cardColor: Color.notifications.background
  property color textColor: Color.notifications.text
  property color mutedColor: Util.alpha(btn.textColor, 0.6)
  signal activated()

  width: btnLabel.implicitWidth + Style.space(28)
  height: btnLabel.implicitHeight + Style.space(14)
  radius: Style.cornerRadius
  color: btn.current ? btn.accent : (btnArea.containsMouse ? Util.alpha(btn.accent, 0.15) : "transparent")
  border.width: Math.max(1, Style.space(2))
  border.color: btn.current ? btn.accent : btn.mutedColor

  Text {
    id: btnLabel
    anchors.centerIn: parent
    text: btn.label
    textFormat: Text.PlainText
    color: btn.current ? btn.cardColor : btn.textColor
    font.family: Style.font.family
    font.pixelSize: Style.font.title
    font.bold: btn.current
  }

  MouseArea {
    id: btnArea
    anchors.fill: parent
    hoverEnabled: true
    onClicked: btn.activated()
  }
}
