import Quickshell
import Quickshell.Io
import QtQuick
import "Logic.js" as Logic

// Polls OmaCal's offline agenda and summons the Alert overlay when a meeting
// enters its alert window. No calendar access of its own: OmaCal has already
// synced everything into its database, and `omacal agenda --json` reads it.
Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null
  property var pluginRegistry: null

  readonly property string pluginId: (root.manifest && root.manifest.id) || "tuland.ominous"
  readonly property string configPath: Quickshell.env("HOME") + "/.config/omarchy/ominous.json"

  property var config: Logic.normalizeConfig(null)
  property var events: []
  // eventKey -> startMs, so a meeting alerts once even though it stays in its
  // window for several ticks. Lost on shell restart, which at worst repeats an
  // alert still inside its window.
  property var fired: ({})
  property string lastError: ""
  property real lastFetchMs: 0

  function log(msg) { console.log("ominous: " + msg) }

  function loadConfig(text) {
    var raw = null
    try { raw = JSON.parse(text || "{}") } catch (e) { root.log("config parse failed, using defaults") }
    root.config = Logic.normalizeConfig(raw)
  }

  function payloadFor(ev) {
    return {
      title: String(ev.title || "Meeting"),
      startMs: Number(ev.startMs),
      endMs: Number(ev.endMs) || 0,
      location: String(ev.location || ""),
      calendar: String(ev.calendar || ""),
      url: Logic.safeUrl(ev.conference),
      dim: root.config.dim
    }
  }

  function summon(payload) {
    if (!root.shell || typeof root.shell.summon !== "function") {
      root.log("shell cannot summon overlays")
      return false
    }
    return root.shell.summon(root.pluginId, JSON.stringify(payload)) === true
  }

  function tick() {
    var now = Date.now()
    var ev = Logic.nextDue(root.events, now, root.config, root.fired)
    if (!ev) return
    root.fired[Logic.eventKey(ev)] = Number(ev.startMs)
    root.log("alert for event " + ev.eventId + (root.summon(root.payloadFor(ev)) ? "" : " (summon failed)"))
  }

  function prune() {
    var cutoff = Date.now() - 24 * 3600 * 1000
    for (var k in root.fired)
      if (root.fired[k] < cutoff) delete root.fired[k]
  }

  FileView {
    path: root.configPath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.loadConfig(text())
    onLoadFailed: root.loadConfig("")
  }

  Process {
    id: agenda
    command: ["omacal", "agenda", "--days", "2", "--json"]
    stdout: StdioCollector { id: agendaOut; waitForEnd: true }
    onExited: function(exitCode) {
      if (exitCode !== 0) {
        root.lastError = "omacal exited with " + exitCode
        root.log(root.lastError)
        return
      }
      try {
        var parsed = JSON.parse(agendaOut.text)
        root.events = Array.isArray(parsed.data) ? parsed.data : []
        root.lastError = ""
        root.lastFetchMs = Date.now()
        root.tick()
      } catch (e) {
        root.lastError = "unreadable omacal output"
        root.log(root.lastError)
      }
    }
  }

  Timer {
    interval: 60000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: {
      if (!agenda.running) agenda.running = true
      root.prune()
    }
  }

  // Wall-clock check every few seconds against the cached agenda, so the alert
  // lands within 5 s of its lead time even though the agenda is read once a
  // minute.
  Timer {
    interval: 5000
    running: true
    repeat: true
    onTriggered: root.tick()
  }

  IpcHandler {
    target: "ominous"

    // Synthetic meeting 60 s out, no calendar needed.
    function test(): string {
      var now = Date.now()
      return root.summon({ title: "Ominous test meeting", startMs: now + 60000, endMs: now + 30 * 60000,
                           location: "Nowhere in particular", calendar: "test",
                           url: "https://meet.google.com/", dim: root.config.dim }) ? "ok" : "failed"
    }

    // Counts and times only, never titles.
    function status(): string {
      var now = Date.now()
      var alertable = root.events.filter(function(ev) { return Logic.isAlertable(ev, root.config) && Number(ev.startMs) > now })
      return JSON.stringify({
        config: root.config,
        events: root.events.length,
        upcomingAlertable: alertable.length,
        nextStart: alertable.length ? new Date(Math.min.apply(null, alertable.map(function(e) { return Number(e.startMs) }))).toISOString() : null,
        lastFetch: root.lastFetchMs ? new Date(root.lastFetchMs).toISOString() : null,
        lastError: root.lastError
      })
    }
  }
}
