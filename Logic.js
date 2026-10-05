.pragma library

// Every decision the plugin makes, as pure functions: no QML types, so the tests
// in tests/ run them under node, and Service.qml and Alert.qml stay glue.
//
//   Constants
//   Values and links ......... numberOrNaN, isThemeName, safeUrl, provider
//   Config and saved state ... normalizeConfig, parseConfig, resolveMode, parseThemeOverrides, resolveThemes
//   Agenda ................... isAlertable, eventKey, nextDue, claimDue, pruneFired, statusSnapshot
//   Timing on the card ....... phase, progress, countdown, isOver
//   Card input ............... isGuarded, initialSelection, nextSelection, activation
//   Themes ................... normalizeSprite, normalizeTheme, pickTheme, frameAt
//   Theme commands ........... themeCatalog, formatThemeList, themeCommand
//   Payloads ................. eventPayload, look, normalizePayload, previewPayload

// ---------------------------------------------------------------- Constants

var DEFAULTS = {
  calendars: [],      // calendar names or ids; empty = every calendar
  leadSeconds: 60,
  dim: null,          // 0..1 opacity of the veil behind the card; null = theme's menu scrim
  tenseSeconds: 15,   // the card turns "tense" this long before the start; 0 = never
  mode: "professional",
  themes: { professional: "classic", playful: "marine" }
}

var MODES = ["professional", "playful"]
var PHASES = ["relaxed", "tense", "angry"]

// A meeting that started at most this long ago still alerts: covers a
// suspend, a shell restart or an OmaCal sync that lands a little late.
var GRACE_SECONDS = 120

var MAX_SPRITE = 32
var DEFAULT_FRAME_MS = 500

var THEME_USAGE = 'usage: theme "<name> [professional|playful]" or theme "reset [professional|playful]"'

// ---------------------------------------------------------------- Values and links

// null, "" and booleans must not read as 0: a 0 tenseSeconds would silently drop the tense phase.
function numberOrNaN(v) {
  return typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN
}

// Theme names end up in a file path, so only a plain slug is accepted.
function isThemeName(name) {
  return typeof name === "string" && /^[a-z0-9_-]{1,40}$/.test(name)
}

// Calendar data is third-party input: only a plain https URL is ever opened.
function safeUrl(url) {
  var s = String(url || "")
  return /^https:\/\/[^\s\\]+$/i.test(s) ? s : ""
}

function provider(url) {
  var m = /^https:\/\/([^\/:?#]+)/i.exec(safeUrl(url))
  if (!m) return ""
  var host = m[1].toLowerCase()
  var known = [["meet.google.com", "Meet"], ["teams.microsoft.com", "Teams"], ["teams.live.com", "Teams"],
               ["zoom.us", "Zoom"], ["webex.com", "Webex"], ["meet.jit.si", "Jitsi"], ["whereby.com", "Whereby"]]
  for (var i = 0; i < known.length; i++)
    if (host === known[i][0] || host.slice(-(known[i][0].length + 1)) === "." + known[i][0]) return known[i][1]
  return "browser"
}

// ---------------------------------------------------------------- Config and saved state

function normalizeConfig(raw) {
  var cfg = {
    calendars: DEFAULTS.calendars.slice(), leadSeconds: DEFAULTS.leadSeconds, dim: DEFAULTS.dim,
    tenseSeconds: DEFAULTS.tenseSeconds, mode: DEFAULTS.mode,
    themes: { professional: DEFAULTS.themes.professional, playful: DEFAULTS.themes.playful }
  }
  if (!raw || typeof raw !== "object") return cfg
  if (Array.isArray(raw.calendars))
    cfg.calendars = raw.calendars.map(function(c) { return String(c).trim().toLowerCase() })
                                 .filter(function(c) { return c !== "" })
  var lead = Number(raw.leadSeconds)
  if (isFinite(lead) && lead >= 0 && lead <= 3600) cfg.leadSeconds = Math.round(lead)
  var dim = raw.dim === null || raw.dim === undefined ? NaN : Number(raw.dim)
  if (isFinite(dim) && dim >= 0 && dim <= 1) cfg.dim = dim
  var tense = numberOrNaN(raw.tenseSeconds)
  if (isFinite(tense) && tense >= 0 && tense <= 3600) cfg.tenseSeconds = Math.round(tense)
  if (MODES.indexOf(raw.mode) >= 0) cfg.mode = raw.mode
  if (raw.themes && typeof raw.themes === "object")
    MODES.forEach(function(m) { if (isThemeName(raw.themes[m])) cfg.themes[m] = raw.themes[m] })
  return cfg
}

// Reads ominous.json's text. A missing file (empty text) is fine; broken JSON gives defaults and an error.
function parseConfig(text) {
  var raw = null, error = ""
  try { raw = JSON.parse(text || "{}") } catch (e) { error = "config parse failed, using defaults" }
  return { config: normalizeConfig(raw), error: error }
}

// The mode saved by the switch wins over the config's. `stateRaw` is the state
// file's text (or an already parsed object); anything unreadable is ignored.
function resolveMode(stateRaw, cfg) {
  var st = stateRaw
  if (typeof st === "string") {
    try { st = JSON.parse(st) } catch (e) { st = null }
  }
  return st && typeof st === "object" && MODES.indexOf(st.mode) >= 0 ? st.mode : cfg.mode
}

// The theme per mode saved by the `theme` command (text or parsed); anything
// unreadable counts as no choice.
function parseThemeOverrides(saved) {
  var raw = saved
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw) } catch (e) { raw = null }
  }
  var out = {}
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    MODES.forEach(function(m) { if (isThemeName(raw[m])) out[m] = raw[m] })
  return out
}

// The theme each mode uses: the saved choice, else ominous.json's (or its default).
function resolveThemes(saved, cfg) {
  var o = parseThemeOverrides(saved)
  return { professional: o.professional || cfg.themes.professional, playful: o.playful || cfg.themes.playful }
}

// ---------------------------------------------------------------- Agenda

function isAlertable(ev, cfg) {
  if (!ev || ev.allDay || ev.response === "declined") return false
  if (!(Number(ev.startMs) > 0)) return false
  if (cfg.calendars.length === 0) return true
  var name = String(ev.calendar || "").toLowerCase()
  var id = String(ev.calendarId)
  return cfg.calendars.indexOf(name) >= 0 || cfg.calendars.indexOf(id) >= 0
}

function eventKey(ev) {
  return String(ev.eventId) + ":" + String(ev.startMs)
}

// The earliest alertable event inside its alert window that has not fired yet,
// or null.
function nextDue(events, nowMs, cfg, fired) {
  var best = null
  for (var i = 0; i < (events || []).length; i++) {
    var ev = events[i]
    if (!isAlertable(ev, cfg) || fired[eventKey(ev)]) continue
    var start = Number(ev.startMs)
    if (nowMs < start - cfg.leadSeconds * 1000 || nowMs >= start + GRACE_SECONDS * 1000) continue
    if (!best || start < Number(best.startMs)) best = ev
  }
  return best
}

// The next event to alert for, marked in `fired` so it alerts once even though it stays in its window.
function claimDue(events, nowMs, cfg, fired) {
  var ev = nextDue(events, nowMs, cfg, fired)
  if (ev) fired[eventKey(ev)] = Number(ev.startMs)
  return ev
}

// Forgets alerts older than a day, in place.
function pruneFired(fired, nowMs) {
  var cutoff = nowMs - 24 * 3600 * 1000
  for (var k in fired)
    if (fired[k] < cutoff) delete fired[k]
  return fired
}

// What the `status` IPC says about the agenda: counts and times, never titles.
function statusSnapshot(events, cfg, nowMs) {
  var starts = (events || []).filter(function(ev) { return isAlertable(ev, cfg) && Number(ev.startMs) > nowMs })
                             .map(function(ev) { return Number(ev.startMs) })
  return { events: (events || []).length, upcomingAlertable: starts.length,
           nextStart: starts.length ? new Date(Math.min.apply(null, starts)).toISOString() : null }
}

// ---------------------------------------------------------------- Timing on the card

// "relaxed" until `tenseSeconds` before the start, "tense" until the start,
// "angry" from then on. A missing start never leaves "relaxed".
function phase(startMs, nowMs, tenseSeconds) {
  var start = Number(startMs)
  if (!(start > 0)) return "relaxed"
  if (nowMs >= start) return "angry"
  return nowMs >= start - tenseSeconds * 1000 ? "tense" : "relaxed"
}

// Bar fill, 0..1: before the start the share of the lead time already elapsed,
// after it the share of the meeting already gone. No end time or no lead = full.
function progress(startMs, endMs, nowMs, leadSeconds) {
  var start = Number(startMs), end = Number(endMs), lead = leadSeconds * 1000
  var f
  if (nowMs < start) f = lead > 0 ? 1 - (start - nowMs) / lead : 1
  else f = end > start ? (nowMs - start) / (end - start) : 1
  return isFinite(f) ? Math.min(1, Math.max(0, f)) : 0
}

// "in 0:42", "now", "started 1:05 ago". Minutes are not capped at 59 because
// the lead time can be up to an hour.
function countdown(startMs, nowMs) {
  var diff = Math.round((Number(startMs) - nowMs) / 1000)
  if (diff === 0) return "now"
  var abs = Math.abs(diff)
  var text = Math.floor(abs / 60) + ":" + ("0" + (abs % 60)).slice(-2)
  return diff > 0 ? "in " + text : "started " + text + " ago"
}

// The card closes by itself when the meeting is over.
function isOver(endMs, nowMs) {
  return endMs > 0 && nowMs >= endMs
}

// ---------------------------------------------------------------- Card input

// Keys and clicks right after the card appears are swallowed: it grabs focus
// mid-typing, and an Enter already on its way must not join a meeting that has
// not been read yet.
function isGuarded(openedAtMs, nowMs, guardMs) {
  return nowMs - openedAtMs < guardMs
}

// Buttons: 0 = Join, 1 = Dismiss. Join is only ever the default when there is a link.
function initialSelection(url) {
  return url !== "" ? 0 : 1
}

// Left, Right and Tab flip between the buttons, if there are two.
function nextSelection(selected, url) {
  return url !== "" ? 1 - selected : selected
}

// What Enter does. Without a link it can only dismiss, whatever is selected.
function activation(selected, url) {
  return selected === 0 && url !== "" ? "join" : "dismiss"
}

// ---------------------------------------------------------------- Themes

// A sprite is a palette (one character -> color token) plus, per phase, frames
// of equal-length text rows. Returns { palette, cols, rows, frames: {phase: [...]} }
// or null when there is no sprite or it is malformed. Every frame of every
// phase shares one size, so the card does not change shape as the phase moves.
function normalizeSprite(rawPalette, rawPhases) {
  if (!rawPalette || typeof rawPalette !== "object" || Array.isArray(rawPalette)) return null
  var palette = {}
  for (var key in rawPalette) {
    if (key.length !== 1) return null
    if (typeof rawPalette[key] === "string" && rawPalette[key].length <= 40) palette[key] = rawPalette[key]
  }
  var cols = 0, rows = 0, frames = {}, any = false
  for (var i = 0; i < PHASES.length; i++) {
    var rawFrames = rawPhases[PHASES[i]] && rawPhases[PHASES[i]].frames
    frames[PHASES[i]] = []
    if (rawFrames === undefined) continue
    if (!Array.isArray(rawFrames) || rawFrames.length === 0) return null
    for (var f = 0; f < rawFrames.length; f++) {
      var frame = rawFrames[f]
      if (!Array.isArray(frame) || frame.length < 1 || frame.length > MAX_SPRITE) return null
      for (var r = 0; r < frame.length; r++) {
        var row = frame[r]
        if (typeof row !== "string" || row.length < 1 || row.length > MAX_SPRITE) return null
        if (cols === 0) { cols = row.length; rows = frame.length }
        if (row.length !== cols || frame.length !== rows) return null
      }
      frames[PHASES[i]].push(frame.slice())
      any = true
    }
  }
  return any ? { palette: palette, cols: cols, rows: rows, frames: frames } : null
}

// Cleans a parsed theme file. Returns null if it is not an object. A bad
// sprite is dropped on its own; colors, captions and the rest still apply.
// Missing colors stay "" for the overlay to fill in with its per-phase defaults.
function normalizeTheme(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  var rawPhases = raw.phases && typeof raw.phases === "object" ? raw.phases : {}
  var sprite = normalizeSprite(raw.palette, rawPhases)
  var theme = { progress: raw.progress === true, palette: sprite ? sprite.palette : {},
                cols: sprite ? sprite.cols : 0, rows: sprite ? sprite.rows : 0, phases: {} }
  PHASES.forEach(function(name) {
    var p = rawPhases[name] && typeof rawPhases[name] === "object" ? rawPhases[name] : {}
    var ms = numberOrNaN(p.frameMs)
    var color = typeof p.color === "string" ? p.color.trim() : ""
    var caption = typeof p.caption === "string" || typeof p.caption === "number"
                  ? String(p.caption).replace(/\s+/g, " ").trim().slice(0, 80) : ""
    theme.phases[name] = {
      color: color.length <= 40 ? color : "",
      caption: caption,
      frames: sprite ? sprite.frames[name] : [],
      frameMs: isFinite(ms) ? Math.min(5000, Math.max(80, Math.round(ms))) : DEFAULT_FRAME_MS,
      shake: p.shake === true
    }
  })
  return theme
}

// Picks the theme to use from the three files a mode watches: the user's
// `<name>.json`, the plugin's `<name>.json` and the plugin's default for the
// mode. Each is { status: "loading" | "ok" | "missing" | "invalid", theme }.
// Returns { theme, error, pending }; a theme that is absent or broken falls
// back to the mode's default and says so in `error`, and the alert never waits
// on a theme (the last resort is an empty theme: plain defaults).
function pickTheme(name, user, shipped, fallback) {
  var error = ""
  if (user.status === "ok") return { theme: user.theme, error: "", pending: false }
  if (user.status === "loading") return { theme: null, error: "", pending: true }
  if (user.status === "invalid") {
    error = 'theme "' + name + '" is not valid JSON or cannot be read'
  } else {
    if (shipped.status === "ok") return { theme: shipped.theme, error: "", pending: false }
    if (shipped.status === "loading") return { theme: null, error: "", pending: true }
    error = 'theme "' + name + '" not found'
  }
  if (fallback.status === "ok") return { theme: fallback.theme, error: error, pending: false }
  if (fallback.status === "loading") return { theme: null, error: "", pending: true }
  return { theme: normalizeTheme({}), error: error + "; default theme unavailable", pending: false }
}

// The sprite frame to draw; the index may run past the end.
function frameAt(frames, index) {
  return frames && frames.length > 0 ? frames[((index % frames.length) + frames.length) % frames.length] : null
}

// ---------------------------------------------------------------- Theme commands
// `themes` lists, `theme "<name> [mode]"` chooses, `theme reset` forgets. The
// choice is saved in its own state file, which only the service writes.

// The themes on disk by name, sorted. A user file wins over a shipped one of the
// same name. Files whose name is not a valid theme name are left out.
function themeCatalog(userFiles, shippedFiles) {
  var byName = {}
  function add(files, where) {
    (files || []).forEach(function(f) {
      var m = /^(.*)\.json$/.exec(String(f))
      if (!m || !isThemeName(m[1])) return
      byName[m[1]] = byName[m[1]] || {}
      byName[m[1]][where] = true
    })
  }
  add(userFiles, "user")
  add(shippedFiles, "shipped")
  return Object.keys(byName).sort().map(function(name) {
    var e = byName[name]
    return { name: name, source: e.user && e.shipped ? "user (overrides shipped)" : e.user ? "user" : "shipped" }
  })
}

// The text `themes` prints: one line per theme, where it comes from, which mode uses it.
// A theme a mode asks for but that is not on disk is listed too, as missing.
function formatThemeList(catalog, effective) {
  var rows = catalog.map(function(t) { return { name: t.name, source: t.source } })
  MODES.forEach(function(m) {
    if (!rows.some(function(r) { return r.name === effective[m] }))
      rows.push({ name: effective[m], source: "missing: falls back to " + DEFAULTS.themes[m] })
  })
  var nameW = Math.max.apply(null, rows.map(function(r) { return r.name.length }))
  var srcW = Math.max.apply(null, rows.map(function(r) { return r.source.length }))
  function pad(s, w) { while (s.length < w) s += " "; return s }
  return rows.map(function(r) {
    var users = MODES.filter(function(m) { return effective[m] === r.name })
    return (pad(r.name, nameW) + "  " + pad(r.source, srcW) + (users.length ? "  <- " + users.join(", ") : "")).replace(/\s+$/, "")
  }).join("\n")
}

// What `theme "<spec>"` means. Returns { error } or { overrides, message }, where
// the overrides are the new saved choice. Without a mode a theme goes to playful.
// `reset` is the command word, so a theme called "reset" can only be chosen in ominous.json.
function themeCommand(spec, overrides, available, activeMode) {
  var words = String(spec || "").trim().split(/\s+/).filter(function(w) { return w !== "" })
  if (words.length < 1 || words.length > 2) return { error: THEME_USAGE }
  var mode = words.length === 2 ? words[1] : ""
  if (mode !== "" && MODES.indexOf(mode) < 0) return { error: THEME_USAGE }
  var next = {}
  MODES.forEach(function(m) { if (overrides && isThemeName(overrides[m])) next[m] = overrides[m] })
  if (words[0] === "reset") {
    (mode !== "" ? [mode] : MODES).forEach(function(m) { delete next[m] })
    return { overrides: next, message: (mode !== "" ? mode + " theme" : "themes") + " back to ominous.json" }
  }
  var name = words[0]
  if (!isThemeName(name) || (available || []).indexOf(name) < 0)
    return { error: 'no theme "' + name + '"; available: ' + (available || []).join(", ") }
  mode = mode || "playful"
  next[mode] = name
  return { overrides: next,
           message: mode + " theme: " + name + (activeMode !== mode
             ? " (the card is in " + activeMode + " mode: press M on it, or click its switch)" : "") }
}

// ---------------------------------------------------------------- Payloads
// What travels from Service.qml to Alert.qml through the shell's summon.

// The meeting part of a payload, from an OmaCal agenda event.
function eventPayload(ev) {
  return { title: String(ev.title || "Meeting"), startMs: Number(ev.startMs), endMs: Number(ev.endMs) || 0,
           location: String(ev.location || ""), calendar: String(ev.calendar || ""), url: safeUrl(ev.conference) }
}

// The look part: timing, dimming, the mode and both themes (already normalized).
function look(cfg, mode, themes) {
  return { dim: cfg.dim, leadSeconds: cfg.leadSeconds, tenseSeconds: cfg.tenseSeconds, mode: mode, themes: themes }
}

// What the overlay makes of a payload. Anyone who can call the shell's IPC can
// summon it, so every field is checked again and a bad one gets its default.
function normalizePayload(p) {
  p = p && typeof p === "object" ? p : {}
  var lead = numberOrNaN(p.leadSeconds), tense = numberOrNaN(p.tenseSeconds)
  var themes = p.themes && typeof p.themes === "object" ? p.themes : {}
  return {
    title: String(p.title || "Meeting"), startMs: Number(p.startMs) || 0, endMs: Number(p.endMs) || 0,
    location: String(p.location || ""), calendar: String(p.calendar || ""), url: safeUrl(p.url),
    dim: typeof p.dim === "number" ? p.dim : null,
    leadSeconds: isFinite(lead) && lead >= 0 ? lead : DEFAULTS.leadSeconds,
    tenseSeconds: isFinite(tense) && tense >= 0 ? tense : DEFAULTS.tenseSeconds,
    mode: p.mode === "playful" ? "playful" : "professional",
    themes: { professional: normalizeTheme(themes.professional) || normalizeTheme({}),
              playful: normalizeTheme(themes.playful) || normalizeTheme({}) }
  }
}

// `preview "<phase> [mode] [title...]"`: a synthetic meeting that lands in one
// phase and stays there. Returns { error } or { payload, overrides }, where the
// overrides (mode, leadSeconds, tenseSeconds) replace the look's own. Relaxed
// and tense start ten minutes out, and tense stretches its threshold to cover
// them, so the phase holds instead of lasting only tenseSeconds.
function previewPayload(spec, nowMs) {
  var words = String(spec || "").trim().split(/\s+/)
  var phase = words[0]
  if (PHASES.indexOf(phase) < 0) return { error: "usage: preview <relaxed|tense|angry> [professional|playful] [title...]" }
  var hasMode = MODES.indexOf(words[1]) >= 0
  var title = words.slice(hasMode ? 2 : 1).join(" ")
  var overrides = {}
  if (hasMode) overrides.mode = words[1]
  if (phase !== "angry") overrides.leadSeconds = 900
  if (phase === "tense") overrides.tenseSeconds = 3600
  return {
    payload: { title: title !== "" ? title : "Ominous preview meeting",
               startMs: phase === "angry" ? nowMs - 20000 : nowMs + 600000, endMs: nowMs + 30 * 60000,
               location: "Nowhere in particular", calendar: "preview", url: "https://meet.google.com/" },
    overrides: overrides
  }
}
