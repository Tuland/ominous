import Quickshell
import Quickshell.Hyprland
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import qs.Commons
import qs.Ui
import "components"
import "Logic.js" as Logic

// A large card in the middle of the focused monitor, over a dimmed screen.
// It stays until dismissed or until the meeting ends: a corner toast is
// exactly what gets missed. The decisions are in Logic.js; this file wires
// them to the window, the keys and the state file.
Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  readonly property string stateDir: Quickshell.env("HOME") + "/.local/state/ominous"
  property var shell: null
  property var manifest: null

  // ---- What the current alert is about (from the payload; see Logic.normalizePayload)
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
  property int leadSeconds: 60
  property int tenseSeconds: 15
  // "professional" | "playful", and the normalized theme of each (Service.qml).
  property string mode: "professional"
  property var themes: ({})

  // ---- Time and input
  property real nowMs: Date.now()
  property real openedAtMs: 0
  readonly property int inputGuardMs: 1000
  readonly property bool guarded: Logic.isGuarded(root.openedAtMs, root.nowMs, root.inputGuardMs)
  // 0 = Join, 1 = Dismiss. Arrows and Tab move it, Enter/Space activate it.
  property int selected: 0

  // ---- Look
  readonly property var theme: root.themes[root.mode] || Logic.normalizeTheme({})
  readonly property string phase: Logic.phase(root.startMs, root.nowMs, root.tenseSeconds)
  readonly property var phaseSpec: root.theme.phases[root.phase]
  readonly property bool started: root.phase === "angry"
  readonly property string providerName: Logic.provider(root.url)
  readonly property real progressFraction: Logic.progress(root.startMs, root.endMs, root.nowMs, root.leadSeconds)

  readonly property color cardColor: Color.notifications.background
  readonly property color textColor: Color.notifications.text
  readonly property color mutedColor: Util.alpha(root.textColor, 0.6)
  readonly property int hero: Style.font.displayLarge
  readonly property int cell: Math.max(3, Math.round(Style.space(7)))
  // Width the sprite takes from the card: it grows by this much, the text column keeps its size.
  property real spriteReserve: sprite.hasArt ? root.theme.cols * root.cell + Style.space(24) : 0
  Behavior on spriteReserve { enabled: root.opened; NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }

  // The theme's color for a phase (a palette role or hex), else the default:
  // accent, accent tinted toward urgent, urgent. The Omarchy palette has no
  // warning role, and a blend stays coherent with every theme.
  function phaseColor(name) {
    var fallback = name === "relaxed" ? Color.accent
                 : name === "tense" ? Qt.tint(Color.accent, Util.alpha(Color.urgent, 0.5))
                 : Color.urgent
    var token = root.theme.phases[name].color
    return token !== "" ? Color.flatColor(token, fallback) : fallback
  }

  // Follows the phase; the Behavior is off while closed so a new alert opens in
  // its color instead of fading from the last alert's.
  property color signalColor: root.phaseColor(root.phase)
  Behavior on signalColor { enabled: root.opened; ColorAnimation { duration: 300 } }

  // ---- Entry points (the shell calls open/close; the card calls the rest)

  function open(payloadJson) {
    var raw = null
    try { raw = JSON.parse(payloadJson || "{}") } catch (e) { raw = null }
    var p = Logic.normalizePayload(raw)
    root.title = p.title
    root.startMs = p.startMs
    root.endMs = p.endMs
    root.location = p.location
    root.calendar = p.calendar
    root.url = p.url
    root.selected = Logic.initialSelection(root.url)
    root.dim = p.dim
    root.leadSeconds = p.leadSeconds
    root.tenseSeconds = p.tenseSeconds
    root.mode = p.mode
    root.themes = p.themes

    var mon = Hyprland.focusedMonitor
    root.targetScreen = Quickshell.screens.find(function(s) { return mon && s.name === mon.name }) || null
    root.nowMs = Date.now()
    root.openedAtMs = root.nowMs
    sprite.reset()
    root.opened = true
    // An alert that opens late is already angry: it jolts on arrival too.
    sprite.maybeShake()
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
    if (Logic.activation(root.selected, root.url) === "join") root.join()
    else root.dismiss()
  }

  // Restyles the open card at once and remembers the choice for later alerts.
  function toggleMode() {
    root.mode = root.mode === "playful" ? "professional" : "playful"
    saveDir.running = true
  }

  function formatTime(ms) { return Qt.formatTime(new Date(ms), "HH:mm") }

  // ---- The mode's state file: the service watches it, this overlay is its
  // only writer. `ominous.json` is never touched.
  Process {
    id: saveDir
    command: ["mkdir", "-p", root.stateDir]
    onExited: stateFile.setText(JSON.stringify({ mode: root.mode }) + "\n")
  }

  FileView {
    id: stateFile
    path: root.stateDir + "/state.json"
    atomicWrites: true
    printErrors: false
    onSaveFailed: console.log("ominous: could not save the mode")
  }

  Timer {
    interval: 250
    running: root.opened
    repeat: true
    onTriggered: {
      root.nowMs = Date.now()
      if (Logic.isOver(root.endMs, root.nowMs)) root.dismiss()
    }
  }

  // ---- The window
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
      // The text column is always `textWidth` wide; a sprite adds its reserve on top.
      readonly property real textWidth: Math.min(Style.space(560), panel.width - Style.gapsOut * 8)
      width: Math.min(card.textWidth + root.spriteReserve, panel.width - Style.gapsOut * 8)
      height: content.implicitHeight + card.contentTopInset + card.contentBottomInset
      // Whole pixels, so the sprite's cells never straddle two screen pixels.
      x: Math.round((panel.width - card.width) / 2)
      y: Math.round((panel.height - card.height) / 2)
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
          else if (event.key === Qt.Key_M) root.toggleMode()
          else if (event.key === Qt.Key_Left || event.key === Qt.Key_Right
                   || event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab)
            root.selected = Logic.nextSelection(root.selected, root.url)
        }
      }

      // In the bottom padding, so it takes no layout space; inset to the
      // content, which also keeps it clear of the rounded corners.
      ProgressLine {
        visible: root.theme.progress
        x: card.contentLeftInset
        width: card.width - card.contentLeftInset - card.contentRightInset
        y: card.height - card.borderBottom - Style.space(10) - height
        fraction: root.progressFraction
        fillColor: root.signalColor
        trackColor: Util.alpha(root.textColor, 0.12)
        animated: root.opened && !root.guarded
      }

      PhaseSprite {
        id: sprite
        x: Math.round(card.contentLeftInset)
        y: Math.round(content.y + titleText.y)
        theme: root.theme
        phase: root.phase
        running: root.opened
        cell: root.cell
      }

      Column {
        id: content
        x: card.contentLeftInset + root.spriteReserve
        y: card.contentTopInset
        width: card.width - card.contentLeftInset - card.contentRightInset - root.spriteReserve
        spacing: Style.space(10)

        Item {
          width: parent.width
          height: Math.max(headline.implicitHeight, modeControl.height)

          Text {
            id: headline
            anchors.left: parent.left
            anchors.right: modeControl.left
            anchors.rightMargin: Style.space(12)
            anchors.verticalCenter: parent.verticalCenter
            text: (root.started ? "MEETING STARTED" : "MEETING") + (root.calendar ? "  ·  " + root.calendar : "")
            color: root.mutedColor
            font.family: Style.font.family
            font.pixelSize: Style.font.body
            font.letterSpacing: 1.5
            elide: Text.ElideRight
          }

          ModeSwitch {
            id: modeControl
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            checked: root.mode === "playful"
            textColor: root.textColor
            mutedColor: root.mutedColor
            accent: root.signalColor
            onToggled: if (!root.guarded) root.toggleMode()
          }
        }

        Text {
          id: titleText
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
          // "started 12:34 ago" is wider than the card at this size.
          fontSizeMode: Text.HorizontalFit
          minimumPixelSize: Style.font.title
        }

        // The theme's one-liner for this phase; it adds nothing to the layout when there is none.
        Text {
          visible: root.phaseSpec.caption !== ""
          width: parent.width
          text: root.phaseSpec.caption
          textFormat: Text.PlainText
          color: root.signalColor
          font.family: Style.font.family
          font.pixelSize: Style.font.title
          maximumLineCount: 1
          elide: Text.ElideRight
        }

        Row {
          spacing: Style.space(12)

          ActionButton {
            visible: root.url !== ""
            label: "Join on " + root.providerName
            current: root.selected === 0
            guarded: root.guarded
            accent: root.signalColor
            cardColor: root.cardColor
            textColor: root.textColor
            mutedColor: root.mutedColor
            onActivated: root.join()
          }

          ActionButton {
            label: "Dismiss"
            current: root.selected === 1
            guarded: root.guarded
            accent: root.signalColor
            cardColor: root.cardColor
            textColor: root.textColor
            mutedColor: root.mutedColor
            onActivated: root.dismiss()
          }
        }

        Text {
          width: parent.width
          elide: Text.ElideRight
          text: (root.url !== "" ? "← →  choose    " : "") + "Enter  confirm    Esc  dismiss    M  mode"
          color: root.mutedColor
          font.family: Style.font.family
          font.pixelSize: Style.font.caption
        }
      }
    }
  }
}
