import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland
import QtQuick
import qs.Commons
import qs.Ui
import "Logic.js" as Logic

// A large card in the middle of the focused monitor, over a dimmed screen.
// It stays until dismissed or until the meeting ends: a corner toast is
// exactly what gets missed.
Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null

  property bool opened: false
  property string title: ""
  property real startMs: 0
  property real endMs: 0
  property string location: ""
  property string calendar: ""
  property string url: ""
  property var targetScreen: null
  // null = the theme's menu scrim; a number = that opacity over the theme background.
  property var dim: null

  property real nowMs: Date.now()
  property real openedAtMs: 0
  // Keys and clicks in the first second are swallowed: the overlay grabs focus
  // mid-typing, and an Enter already on its way must not join a meeting that
  // has not been read yet.
  readonly property int inputGuardMs: 1000
  readonly property bool guarded: root.nowMs - root.openedAtMs < root.inputGuardMs

  // 0 = Join, 1 = Dismiss. Arrows and Tab move it, Enter/Space activate it.
  property int selected: 0

  readonly property bool started: root.startMs > 0 && root.nowMs >= root.startMs
  readonly property string providerName: Logic.provider(root.url)

  readonly property color cardColor: Color.notifications.background
  readonly property color textColor: Color.notifications.text
  readonly property color mutedColor: Util.alpha(root.textColor, 0.6)
  readonly property color signalColor: root.started ? Color.urgent : Color.accent
  readonly property int hero: Style.font.displayLarge

  function open(payloadJson) {
    var p = ({})
    try { p = JSON.parse(payloadJson || "{}") } catch (e) { p = ({}) }
    root.title = String(p.title || "Meeting")
    root.startMs = Number(p.startMs) || 0
    root.endMs = Number(p.endMs) || 0
    root.location = String(p.location || "")
    root.calendar = String(p.calendar || "")
    root.url = Logic.safeUrl(p.url)
    root.selected = root.url !== "" ? 0 : 1
    root.dim = typeof p.dim === "number" ? p.dim : null

    var mon = Hyprland.focusedMonitor
    root.targetScreen = Quickshell.screens.find(function(s) { return mon && s.name === mon.name }) || null
    root.nowMs = Date.now()
    root.openedAtMs = root.nowMs
    root.opened = true
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function close() {
    root.opened = false
  }

  function dismiss() {
    root.opened = false
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide((root.manifest && root.manifest.id) || "tuland.ominous")
  }

  function join() {
    if (root.url === "") return
    Quickshell.execDetached(["omarchy-launch-browser", root.url])
    root.dismiss()
  }

  function activate() {
    if (root.selected === 0) root.join()
    else root.dismiss()
  }

  function formatTime(ms) { return Qt.formatTime(new Date(ms), "HH:mm") }

  component ActionButton: Rectangle {
    id: btn
    property string label: ""
    property bool current: false
    signal activated()

    width: btnLabel.implicitWidth + Style.space(28)
    height: btnLabel.implicitHeight + Style.space(14)
    radius: Style.cornerRadius
    color: btn.current ? root.signalColor : (btnArea.containsMouse ? Util.alpha(root.signalColor, 0.15) : "transparent")
    border.width: Math.max(1, Style.space(2))
    border.color: btn.current ? root.signalColor : root.mutedColor

    Text {
      id: btnLabel
      anchors.centerIn: parent
      text: btn.label
      color: btn.current ? root.cardColor : root.textColor
      font.family: Style.font.family
      font.pixelSize: Style.font.title
      font.bold: btn.current
    }

    MouseArea {
      id: btnArea
      anchors.fill: parent
      hoverEnabled: true
      onClicked: if (!root.guarded) btn.activated()
    }
  }

  Timer {
    interval: 250
    running: root.opened
    repeat: true
    onTriggered: {
      root.nowMs = Date.now()
      if (root.endMs > 0 && root.nowMs >= root.endMs) root.dismiss()
    }
  }

  PanelWindow {
    id: panel
    visible: root.opened
    screen: root.targetScreen
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "ominous-alert"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive
    exclusionMode: ExclusionMode.Ignore

    Rectangle {
      anchors.fill: parent
      color: root.dim === null ? Color.menu.scrim : Util.alpha(Color.background, root.dim)
    }

    MouseArea {
      anchors.fill: parent
      onClicked: if (!root.guarded) root.dismiss()
    }

    BorderSurface {
      id: card
      width: Math.min(Style.space(560), panel.width - Style.gapsOut * 8)
      height: content.implicitHeight + card.contentTopInset + card.contentBottomInset
      anchors.centerIn: parent
      radius: Style.cornerRadius
      color: root.cardColor
      borderSpec: Border.surfaceSpec("notifications", "border", Color.notifications.border, Math.max(2, Style.space(3)))
      padding: Style.space(28)

      MouseArea { anchors.fill: parent; onClicked: {} }

      Item {
        id: keyCatcher
        anchors.fill: parent
        focus: true
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
          event.accepted = true
          if (root.guarded) return
          if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) root.activate()
          else if (event.key === Qt.Key_Escape) root.dismiss()
          else if (root.url !== "" && (event.key === Qt.Key_Left || event.key === Qt.Key_Right
                   || event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab))
            root.selected = 1 - root.selected
        }
      }

      Column {
        id: content
        x: card.contentLeftInset
        y: card.contentTopInset
        width: card.width - card.contentLeftInset - card.contentRightInset
        spacing: Style.space(10)

        Text {
          width: parent.width
          text: (root.started ? "MEETING STARTED" : "MEETING") + (root.calendar ? "  ·  " + root.calendar : "")
          color: root.mutedColor
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.letterSpacing: 1.5
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          text: root.title
          textFormat: Text.PlainText
          color: root.textColor
          font.family: Style.font.family
          font.pixelSize: Math.round(root.hero * 1.3)
          font.bold: true
          wrapMode: Text.Wrap
          maximumLineCount: 3
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          text: root.formatTime(root.startMs) + (root.endMs > 0 ? " – " + root.formatTime(root.endMs) : "")
                + (root.location ? "   " + root.location : "")
          textFormat: Text.PlainText
          color: root.mutedColor
          font.family: Style.font.family
          font.pixelSize: Style.font.heading
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          topPadding: Style.space(8)
          bottomPadding: Style.space(8)
          text: Logic.countdown(root.startMs, root.nowMs)
          color: root.signalColor
          font.family: Style.font.family
          font.pixelSize: Math.round(root.hero * 2)
          font.bold: true
        }

        Row {
          spacing: Style.space(12)

          ActionButton {
            visible: root.url !== ""
            label: "Join on " + root.providerName
            current: root.selected === 0
            onActivated: root.join()
          }

          ActionButton {
            label: "Dismiss"
            current: root.selected === 1
            onActivated: root.dismiss()
          }
        }

        Text {
          text: (root.url !== "" ? "← →  choose    " : "") + "Enter  confirm    Esc  dismiss"
          color: root.mutedColor
          font.family: Style.font.family
          font.pixelSize: Style.font.caption
        }
      }
    }
  }
}
