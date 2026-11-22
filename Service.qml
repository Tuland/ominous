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
  // True once mkdir has run for the state and user themes folders (if it failed, the files
  // report themselves missing): the files inside them take their paths from it, so each one
  // loads and is watched as soon as it can be, with no reload call.
  property bool dirsReady: false

  property var config: Logic.normalizeConfig(null)
  // What the last read of ominous.json found wrong: keys Ominous does not use, values it refused,
  // or why the file could not be read. Shown by `status` and in the log, never on the card.
  property var unknownKeys: []
  property var ignoredValues: []
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
  // The agenda card on screen, so a refresh can follow its meeting (Logic.followShown), or
  // null. Set only when a summon succeeds; `test` and `preview` clear it.
  property var shown: null
  // When the countdown of the card on screen ends (epoch ms), 0 without one; set by summon().
  property real closingUntilMs: 0
  // When the hold of real alerts ends (epoch ms), 0 without one; set by the `hold` command, in
  // memory only, so a shell restart ends it.
  property real holdUntilMs: 0
  property string lastError: ""
  property real lastFetchMs: 0

  /** Writes a line to the shell's log, prefixed with "ominous:". */
  function log(msg: string): void { console.log("ominous: " + msg) }

  /**
   * Applies ominous.json's text; broken JSON keeps the defaults. Logs one line when the file has
   * unknown keys, refused values or cannot be read, and keeps them for `status`.
   *
   * @param text The file's content.
   */
  function loadConfig(text: string): void {
    var r = Logic.parseConfig(text)
    if (r.error) root.log(r.error)
    if (r.unknownKeys.length > 0) root.log("unknown key" + (r.unknownKeys.length > 1 ? "s" : "") + " in ominous.json (ignored): " + r.unknownKeys.map(function(k) { return Logic.quoted(k) }).join(", "))
    if (r.ignored.length > 0) root.log("ominous.json values ignored, the default is used: " + r.ignored.join("; "))
    root.config = r.config
    root.unknownKeys = r.unknownKeys
    root.ignoredValues = r.ignored
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
    for (const k in look) p[k] = look[k]
    return p
  }

  /**
   * The full payload for an agenda event.
   *
   * @param ev The event.
   */
  function payloadFor(ev: var): var { return root.withLook(Logic.eventPayload(ev)) }

  /**
   * Opens the overlay with a payload, and notes when its countdown ends (Logic.closingUntil).
   *
   * @param payload The payload object.
   * @returns Whether the shell accepted it.
   */
  function summon(payload: var): bool {
    if (!root.shell || typeof root.shell.summon !== "function") {
      root.log("shell cannot summon overlays")
      return false
    }
    const ok = root.shell.summon(root.pluginId, JSON.stringify(payload)) === true
    if (ok) root.closingUntilMs = Logic.closingUntil(payload, Date.now())
    return ok
  }

  /**
   * Alerts for the next due event, if any, unless a hold or a closing card holds alerts. The
   * first run after a hold ends follows the agenda card first. Runs every 5 s.
   */
  function tick(): void {
    if (Logic.holdsAlerts(root.holdUntilMs, null, Date.now())) return
    if (root.holdUntilMs !== 0) {
      root.holdUntilMs = 0
      root.follow()
    }
    // A closing card's note stays readable: new alerts wait for its countdown.
    if (Logic.holdsAlerts(root.closingUntilMs, root.overlayOpen(), Date.now())) return
    var ev = Logic.claimDue(root.events, Date.now(), root.config, root.fired)
    if (!ev) return
    const ok = root.summon(root.payloadFor(ev))
    if (ok) root.shown = Logic.shownFor(ev, root.config)
    root.log("alert for event " + Logic.quoted(ev.eventId) + (ok ? "" : " (summon failed)"))
  }

  /**
   * Whether the overlay is on screen, or null when the shell cannot tell.
   *
   * @returns true, false or null.
   */
  function overlayOpen(): var {
    return root.shell && typeof root.shell.isPluginOpen === "function" ? root.shell.isPluginOpen(root.pluginId) === true : null
  }

  /**
   * After a refresh, makes the agenda card on screen follow its meeting: Logic.followShown
   * decides, this applies. A failed summon hides the card, so the old meeting never stays.
   * During a hold the card is only forgotten when closed; tick() follows again when it ends.
   */
  function follow(): void {
    const now = Date.now()
    const r = Logic.followShown(root.shown, root.overlayOpen(), root.events, now, Logic.holdsAlerts(root.holdUntilMs, null, now))
    if (r.action === "keep") return
    if (r.action === "update" && root.summon(root.withLook(r.payload))) {
      root.shown = r.next
      return
    }
    if (r.action !== "forget" && root.shell && typeof root.shell.hide === "function") root.shell.hide(root.pluginId)
    root.shown = null
  }

  /** Forgets alerts older than a day. */
  function prune(): void { Logic.pruneFired(root.fired, Date.now()) }

  FileView {
    path: root.configPath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.loadConfig(text())
    // A missing file is the normal case: the defaults, silently. Any other failure
    // (permissions, a directory) is reported, as a broken file is.
    onLoadFailed: function(error) {
      root.loadConfig("")
      if (error !== FileViewError.FileNotFound) {
        root.configError = "config cannot be read, using defaults"
        root.log(root.configError)
      }
    }
  }

  // A file can only be watched once its directory exists, so create the state
  // and the user themes directories up front; the files follow `dirsReady`.
  Process {
    command: ["mkdir", "-p", root.stateDir, root.userThemesDir]
    running: true
    // Set on failure too: the files then report themselves missing, and the service still runs.
    onExited: function(exitCode) {
      if (exitCode !== 0) root.log("could not create " + root.stateDir + " or " + root.userThemesDir)
      root.dirsReady = true
    }
  }

  FileView {
    id: stateFile
    path: root.dirsReady ? root.stateDir + "/state.json" : ""
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.stateText = text()
    onLoadFailed: root.stateText = ""
  }

  FileView {
    id: themesFile
    path: root.dirsReady ? root.stateDir + "/themes.json" : ""
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
    folder: root.dirsReady ? "file://" + encodeURI(root.userThemesDir) : ""
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
    for (let i = 0; i < model.count; i++) out.push(model.get(i, "fileName"))
    return out
  }

  /** The themes on disk (see Logic.themeCatalog). */
  function themeCatalog(): var { return Logic.themeCatalog(root.fileNames(userThemeFiles), root.fileNames(shippedThemeFiles)) }

  ThemeSlot {
    id: professionalTheme
    mode: "professional"
    name: root.themeNames.professional
    userDir: root.dirsReady ? root.userThemesDir : ""
    shippedDir: root.shippedThemesDir
  }

  ThemeSlot {
    id: playfulTheme
    mode: "playful"
    name: root.themeNames.playful
    userDir: root.dirsReady ? root.userThemesDir : ""
    shippedDir: root.shippedThemesDir
  }

  onThemeErrorChanged: if (root.themeError !== "") root.log(root.themeError)

  Process {
    id: agenda
    // At most 1 MiB and one byte of OmaCal's output ever reaches the shell (Logic.AGENDA_COMMAND).
    command: Logic.AGENDA_COMMAND
    stdout: StdioCollector { id: agendaOut; waitForEnd: true }
    onExited: function(exitCode) {
      const r = Logic.readAgenda(root.events, agendaOut.text, exitCode)
      root.events = r.events
      root.lastError = r.error
      if (r.error !== "") {
        root.log(r.error)
        return
      }
      root.lastFetchMs = Date.now()
      root.follow()
      root.tick()
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
      const ok = root.summon(root.withLook({ title: "Ominous test meeting", startMs: now + 60000, endMs: now + 30 * 60000,
                                             location: "Nowhere in particular", calendar: "test",
                                             url: "https://meet.google.com/" }))
      if (ok) root.shown = null
      return ok ? "ok" : "failed"
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
      for (const k in r.overrides) p[k] = r.overrides[k]
      const ok = root.summon(p)
      if (ok) root.shown = null
      return ok ? "ok" : "failed"
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
      // Before the folders are ready the state file has no path, so a write would be lost, and
      // the theme folders may not be listed yet, so a theme would be "not found". A folder that
      // does not exist ends Ready too, so this never waits forever.
      if (!root.dirsReady || userThemeFiles.status === FolderListModel.Loading
          || shippedThemeFiles.status === FolderListModel.Loading) return "not ready yet, try again"
      var names = root.themeCatalog().map(function(t) { return t.name })
      var r = Logic.themeCommand(spec, Logic.parseThemeOverrides(root.themesStateText), names, root.mode)
      if (r.error) return r.error
      var text = JSON.stringify(r.overrides) + "\n"
      root.themesStateText = text   // takes effect now; the file catches up
      themesFile.setText(text)
      return r.message
    }

    /**
     * IPC: holds real alerts for a while, for development captures: `hold 30` (whole seconds, at
     * most 60); `hold 0` ends it. It ends by itself; `test` and `preview` still work.
     *
     * @param spec The seconds.
     */
    function hold(spec: string): string {
      const r = Logic.holdCommand(spec, Date.now())
      if (r.error) return r.error
      root.holdUntilMs = r.untilMs
      if (r.untilMs === 0) root.follow()
      return r.message
    }

    /**
     * IPC: the complete effective config as text for ominous.json: your values, the defaults for
     * the rest, each key under a one-line comment, and the unknown keys and refused values of
     * your file named at the top. Prints only; no file is written.
     */
    function config(): string {
      return Logic.formatConfig(root.config, root.unknownKeys, root.ignoredValues)
    }

    /** IPC: the config and what is wrong with the file, counts and times, and the last error; never titles. */
    function status(): string {
      var s = Logic.statusSnapshot(root.events, root.config, Date.now())
      return JSON.stringify({
        config: root.config,
        unknownKeys: root.unknownKeys,
        ignoredValues: root.ignoredValues,
        configError: root.configError,
        mode: root.mode,
        themes: root.themeNames,
        themeError: root.themeError,
        events: s.events,
        upcomingAlertable: s.upcomingAlertable,
        nextStart: s.nextStart,
        lastFetch: root.lastFetchMs ? new Date(root.lastFetchMs).toISOString() : null,
        lastError: root.lastError,
        holdSeconds: Logic.holdLeft(root.holdUntilMs, Date.now())
      })
    }
  }
}
