import QtQuick
import qs.Commons
import qs.Ui

/**
 * The "?" beside the Join button of a link Ominous does not recognize, with a tooltip that
 * says why. The tooltip shows while `showWhile` is true (Join selected), while the pointer is
 * over the "?", and after a click on it until the next click.
 *
 * In: `text`, the tooltip (plain text); `showWhile`; the colors.
 */
Item {
  id: notice

  property string text: ""
  property bool showWhile: false
  property color textColor: Color.notifications.text
  property color mutedColor: Util.alpha(notice.textColor, 0.6)
  // Set by a click on the "?", cleared by the next one and whenever the card closes.
  property bool pinned: false

  implicitWidth: mark.implicitWidth + Style.space(8)
  implicitHeight: mark.implicitHeight

  onVisibleChanged: if (!notice.visible) notice.pinned = false

  Text {
    id: mark
    anchors.centerIn: parent
    text: "?"
    textFormat: Text.PlainText
    color: noticeArea.containsMouse || notice.pinned ? notice.textColor : notice.mutedColor
    font.family: Style.font.family
    font.pixelSize: Style.font.title
    font.bold: true
  }

  MouseArea {
    id: noticeArea
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: notice.pinned = !notice.pinned
  }

  PanelToolTip {
    visible: notice.visible && (notice.showWhile || noticeArea.containsMouse || notice.pinned)
    text: notice.text
  }
}
