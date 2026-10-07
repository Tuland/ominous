import Quickshell
import Quickshell.Io
import QtQuick
import Qt.labs.folderlistmodel
import "components"
import "Logic.js" as Logic

/**
 * The background service: polls OmaCal's offline agenda and summons the Alert overlay when a
 * meeting enters its alert window. No calendar access of its own: OmaCal has already synced
 * everything into its database, and `omacal agenda --json` reads it.
 *
 * In: `shell`, `manifest` and `pluginRegistry` from the plugin host; ominous.json, the state
 * files and the theme folders, all watched.
 * Out: `shell.summon` calls; the IPC target `ominous`; writes only themes.json.
 */
Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null
  property var pluginRegistry: null

  readonly property string pluginId: (root.manifest && root.manifest.id) || "io.github.tuland.ominous"
  readonly property string configPath: Quickshell.env("HOME") + "/.config/omarchy/ominous.json"

  readonly property string userThemesDir: Quickshell.env("HOME") + "/.config/omarchy/ominous/themes"
  readonly property string shippedThemesDir: decodeURIComponent(Qt.resolvedUrl("themes").toString().replace(/^file:\/\//, ""))
  // The overlay writes the mode here when the card's switch is toggled; this
  // side only reads it, so there is exactly one writer.
  readonly property string stateDir: Quickshell.env("HOME") + "/.local/state/ominous"

  property var config: Logic.normalizeConfig(null)
  // What the last read of ominous.json found wrong: keys Ominous does not use, or why the file
  // could not be read. Shown by `status` and in the log, never on the card.
  property var unknownKeys: []
  property string configError: ""
  property string stateText: ""
  readonly property string mode: Logic.resolveMode(root.stateText, root.config)
  // The `theme` command's choice (themes.json, written only here) over ominous.json's.
  property string themesStateText: ""
  readonly property var themeNames: Logic.resolveThemes(root.themesStateText, root.config)
  readonly property string themeError: [professionalTheme.picked.error, playfulTheme.picked.error]
                                         .filter(function(e) { return e !== "" }).join("; ")
  property var events: []
  // eventKey -> startMs, so a meeting alerts once even though it stays in its
  // window for several ticks. Lost on shell restart, which at worst repeats an
  // alert still inside its window.
  property var fired: ({})
  property string lastError: ""
  property real lastFetchMs: 0

  /** Writes a line to the shell's log, prefixed with "ominous:". */
  function log(msg: string): void { console.log("ominous: " + msg) }

  /**
   * Applies ominous.json's text; broken JSON keeps the defaults. Logs one line when the file has
   * unknown keys or cannot be read, and keeps both for `status`.
   *
   * @param text The file's content.
   */
  function loadConfig(text: string): void {
    var r = Logic.parseConfig(text)
    if (r.error) root.log(r.error)
    if (r.unknownKeys.length > 0) root.log("unknown key" + (r.unknownKeys.length > 1 ? "s" : "") + " in ominous.json (ignored): " + r.unknownKeys.join(", "))
    root.config = r.config
    root.unknownKeys = r.unknownKeys
    root.configError = r.error
  }

  /**
   * Adds what every alert carries besides the meeting: timing, dimming and the look. Both
   * themes travel with it so the card's switch can flip modes without a round trip to this
   * service.
   *
   * @param p The meeting part of a payload; changed in place.
   * @returns The same object.
   */
  function withLook(p: var): var {
    var look = Logic.look(root.config, root.mode, { professional: professionalTheme.theme, playful: playfulTheme.theme })
    for (var k in look) p[k] = look[k]
    return p
  }

  /**
   * The full payload for an agenda event.
   *
   * @param ev The event.
   */
  function payloadFor(ev: var): var { return root.withLook(Logic.eventPayload(ev)) }

  /**
   * Opens the overlay with a payload.
   *
   * @param payload The payload object.
   * @returns Whether the shell accepted it.
   */
  function summon(payload: var): bool {
    if (!root.shell || typeof root.shell.summon !== "function") {
      root.log("shell cannot summon overlays")
      return false
    }
    return root.shell.summon(root.pluginId, JSON.stringify(payload)) === true
  }

  /** Alerts for the next due event, if any. Runs every 5 s. */
  function tick(): void {
    var ev = Logic.claimDue(root.events, Date.now(), root.config, root.fired)
    if (!ev) return
    root.log("alert for event " + ev.eventId + (root.summon(root.payloadFor(ev)) ? "" : " (summon failed)"))
  }

  /** Forgets alerts older than a day. */
  function prune(): void { Logic.pruneFired(root.fired, Date.now()) }

  FileView {
    path: root.configPath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.loadConfig(text())
    onLoadFailed: root.loadConfig("")
  }

  // A file can only be watched once its directory exists, so create the state
  // and the user themes directories up front and load their files after.
  Process {
    command: ["mkdir", "-p", root.stateDir, root.userThemesDir]
    running: true
    onExited: {
      stateFile.reload()
      themesFile.reload()
      professionalTheme.reloadUserFile()
      playfulTheme.reloadUserFile()
    }
  }

  FileView {
    id: stateFile
    path: root.stateDir + "/state.json"
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.stateText = text()
    onLoadFailed: root.stateText = ""
  }

  FileView {
    id: themesFile
    path: root.stateDir + "/themes.json"
    watchChanges: true
    atomicWrites: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.themesStateText = text()
    onLoadFailed: root.themesStateText = ""
    onSaveFailed: root.log("could not save the theme choice")
  }

  // Both theme folders, kept current by the models themselves, for `themes` and `theme`.
  FolderListModel {
    id: userThemeFiles
    folder: "file://" + encodeURI(root.userThemesDir)
    nameFilters: ["*.json"]
    showDirs: false
  }

  FolderListModel {
    id: shippedThemeFiles
    folder: Qt.resolvedUrl("themes")
    nameFilters: ["*.json"]
    showDirs: false
  }

  /**
   * The file names a folder model lists.
   *
   * @param model A FolderListModel.
   * @returns The names, as a list of strings.
   */
  function fileNames(model: var): var {
    var out = []
    for (var i = 0; i < model.count; i++) out.push(model.get(i, "fileName"))
    return out
  }

  /** The themes on disk (see Logic.themeCatalog). */
  function themeCatalog(): var { return Logic.themeCatalog(root.fileNames(userThemeFiles), root.fileNames(shippedThemeFiles)) }

  ThemeSlot {
    id: professionalTheme
    mode: "professional"
    name: root.themeNames.professional
    userDir: root.userThemesDir
    shippedDir: root.shippedThemesDir
  }

  ThemeSlot {
    id: playfulTheme
    mode: "playful"
    name: root.themeNames.playful
    userDir: root.userThemesDir
    shippedDir: root.shippedThemesDir
  }

  onThemeErrorChanged: if (root.themeError !== "") root.log(root.themeError)

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

    /** IPC: a synthetic meeting 60 s out, no calendar needed. */
    function test(): string {
      var now = Date.now()
      return root.summon(root.withLook({ title: "Ominous test meeting", startMs: now + 60000, endMs: now + 30 * 60000,
                                         location: "Nowhere in particular", calendar: "test",
                                         url: "https://meet.google.com/" })) ? "ok" : "failed"
    }

    /**
     * IPC: holds the card in one phase, to look at a theme: `preview "angry playful"`. Without a
     * mode the active one is used (and nothing is saved), and a long title is how to check that
     * text fits.
     *
     * @param spec "<phase> [mode] [title...]".
     */
    function preview(spec: string): string {
      var r = Logic.previewPayload(spec, Date.now())
      if (r.error) return r.error
      var p = root.withLook(r.payload)
      for (var k in r.overrides) p[k] = r.overrides[k]
      return root.summon(p) ? "ok" : "failed"
    }

    /** IPC: every theme on disk, where it comes from, and which mode uses it. */
    function themes(): string {
      return Logic.formatThemeList(root.themeCatalog(), root.themeNames)
    }

    /**
     * IPC: chooses a theme, e.g. `theme "shiba"`, `theme "marine professional"`,
     * `theme "reset [mode]"`. Saved to themes.json, never to ominous.json; applies from the
     * next alert.
     *
     * @param spec "<name> [mode]" or "reset [mode]".
     */
    function theme(spec: string): string {
      var names = root.themeCatalog().map(function(t) { return t.name })
      var r = Logic.themeCommand(spec, Logic.parseThemeOverrides(root.themesStateText), names, root.mode)
      if (r.error) return r.error
      var text = JSON.stringify(r.overrides) + "\n"
      root.themesStateText = text   // takes effect now; the file catches up
      themesFile.setText(text)
      return r.message
    }

    /**
     * IPC: the complete effective config as text for ominous.json: your values, the defaults for
     * the rest, each key under a one-line comment, and the unknown keys of your file named at
     * the top. Prints only; no file is written.
     */
    function config(): string {
      return Logic.formatConfig(root.config, root.unknownKeys)
    }

    /** IPC: the config and what is wrong with the file, counts and times, and the last error; never titles. */
    function status(): string {
      var s = Logic.statusSnapshot(root.events, root.config, Date.now())
      return JSON.stringify({
        config: root.config,
        unknownKeys: root.unknownKeys,
        configError: root.configError,
        mode: root.mode,
        themes: root.themeNames,
        themeError: root.themeError,
        events: s.events,
        upcomingAlertable: s.upcomingAlertable,
        nextStart: s.nextStart,
        lastFetch: root.lastFetchMs ? new Date(root.lastFetchMs).toISOString() : null,
        lastError: root.lastError
      })
    }
  }
}
