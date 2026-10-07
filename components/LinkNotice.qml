import QtQuick
import qs.Commons
import qs.Ui

/**
 * The "?" beside the Join button of a link Ominous does not recognize, with a tooltip that
 * says why. The tooltip shows while `showWhile` is true (Join selected), while the pointer is
 * over the "?", and after a click on it until the next click or until the card closes.
 *
 * In: `text`, the tooltip (plain text); `showWhile`; `active`, true while the card is open;
 * `bounds`, the item the tooltip must stay inside (the card); the colors.
 */
Item {
  id: notice

  property string text: ""
  property bool showWhile: false
  property bool active: false
  property Item bounds: null
  property color textColor: Color.notifications.text
  property color mutedColor: Util.alpha(notice.textColor, 0.6)
  // Set by a click on the "?", cleared by the next one and whenever the card closes.
  property bool pinned: false

  implicitWidth: mark.implicitWidth + Style.space(8)
  implicitHeight: mark.implicitHeight

  onActiveChanged: if (!notice.active) notice.pinned = false
  // A new alert can replace the payload of a card that is still open: its link starts unpinned.
  onTextChanged: notice.pinned = false

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
    visible: notice.active && notice.visible && (notice.showWhile || noticeArea.containsMouse || notice.pinned)
    text: notice.text
    // Centred on the "?", then moved to stay inside `bounds`: the "?" sits right of the card's
    // middle, and a wide tooltip would stick out of its right edge.
    x: {
      var centred = (notice.width - width) / 2
      if (!notice.bounds) return centred
      // From the parent and notice.x, so the binding follows the "?" when the row moves it.
      var left = notice.parent ? notice.parent.mapToItem(notice.bounds, notice.x, 0).x : 0
      var inside = Math.max(0, Math.min(left + centred, notice.bounds.width - width))
      return inside - left
    }
  }
}
