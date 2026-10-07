import QtQuick
import qs.Commons
import qs.Ui

/**
 * The professional/playful switch. Quiet on purpose: faint until the pointer is on it, its
 * label shows only then, and it is not in the card's Tab cycle, so it can never be what Enter
 * confirms.
 *
 * In: `checked` (playful); the colors.
 * Out: `toggled()` on a click.
 */
Row {
  id: control

  property bool checked: false
  property color textColor: Color.notifications.text
  property color mutedColor: Util.alpha(control.textColor, 0.6)
  property color accent: Color.accent
  signal toggled()

  spacing: Style.space(8)
  opacity: toggle.containsMouse ? 1 : 0.45
  Behavior on opacity { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

  Text {
    anchors.verticalCenter: parent.verticalCenter
    text: "Playful"
    textFormat: Text.PlainText
    color: control.mutedColor
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
    opacity: toggle.containsMouse ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
  }

  ToggleSwitch {
    id: toggle
    anchors.verticalCenter: parent.verticalCenter
    checked: control.checked
    cursorRing: false
    trackHeight: Math.max(14, Math.round(Style.font.body * 1.1))
    foreground: control.textColor
    accent: control.accent
    onToggled: control.toggled()
  }
}
