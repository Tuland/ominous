.pragma library

// Every decision the plugin makes, as pure functions: no QML types, so the tests
// in tests/ run them under node, and Service.qml and Alert.qml stay glue.
//
//   Constants
//   Values and links ......... numberOrNaN, isThemeName, safeUrl, provider
//   Config and saved state ... normalizeConfig, stripJsonc, parseConfig, formatConfig, configSchema, resolveMode, parseThemeOverrides, resolveThemes
//   Agenda ................... isAlertable, eventKey, nextDue, claimDue, pruneFired, statusSnapshot
//   Timing on the card ....... phase, progress, countdown, isOver
//   Card input ............... isGuarded, initialSelection, nextSelection, activation
//   Themes ................... normalizeSprite, normalizeTheme, pickTheme, frameAt
//   Theme commands ........... themeCatalog, formatThemeList, themeCommand
//   Payloads ................. eventPayload, look, normalizePayload, previewPayload

// ---------------------------------------------------------------- Constants

/**
 * The one declaration of every key ominous.json reads, in the order the printed config shows
 * them. The defaults, the comments of `config`, the example file and the JSON Schema all come
 * from here; normalizeConfig stays hand-written and a test checks it accepts each default.
 *
 * @type {ConfigField[]}
 */
var CONFIG_FIELDS = [
  { key: "calendars", default: [],
    description: "Calendars that alert, by name or id (see `omacal calendars`). Empty = all of them.",
    schema: { type: "array", items: { type: "string" } } },
  { key: "onlyWithLink", default: false,
    description: "true = alert only for meetings with an https join link.",
    schema: { type: "boolean" } },
  { key: "leadSeconds", default: 60,
    description: "Seconds before the start when the card appears (0-3600).",
    schema: { type: "integer", minimum: 0, maximum: 3600 } },
  { key: "tenseSeconds", default: 15,
    description: "Seconds before the start when the card turns tense (0-3600); 0 = never.",
    schema: { type: "integer", minimum: 0, maximum: 3600 } },
  { key: "dim", default: null,
    description: "Opacity of the veil behind the card, 0-1; null = the theme's own.",
    schema: { type: ["number", "null"], minimum: 0, maximum: 1 } },
  { key: "mode", default: "professional",
    description: "Mode until you switch on the card (M): professional or playful.",
    schema: { enum: ["professional", "playful"] } },
  { key: "themes", default: { professional: "classic", playful: "marine" },
    description: "Theme of each mode (see `omarchy-shell ominous themes`).",
    schema: { type: "object",
              properties: { professional: { type: "string", pattern: "^[a-z0-9_-]{1,40}$" },
                            playful: { type: "string", pattern: "^[a-z0-9_-]{1,40}$" } },
              additionalProperties: false } }
]

/** Where the schema of ominous.json is published, for the `$schema` key of the printed config. */
var SCHEMA_URL = "https://raw.githubusercontent.com/Tuland/ominous/main/docs/ominous.schema.json"

/** Where the keys are explained at length. */
var CONFIG_DOCS_URL = "https://github.com/Tuland/ominous/blob/main/docs/configuration.md"

/** @type {Config} */
var DEFAULTS = (function() {
  var d = /** @type {*} */ ({})
  CONFIG_FIELDS.forEach(function(f) { d[f.key] = f.default })
  return d
})()

/** @type {Mode[]} */
var MODES = ["professional", "playful"]
/** @type {Phase[]} */
var PHASES = ["relaxed", "tense", "angry"]

// A meeting that started at most this long ago still alerts: covers a
// suspend, a shell restart or an OmaCal sync that lands a little late.
var GRACE_SECONDS = 120

var MAX_SPRITE = 32
var DEFAULT_FRAME_MS = 500

var THEME_USAGE = 'usage: theme "<name> [professional|playful]" or theme "reset [professional|playful]"'

/**
 * @typedef {"professional"|"playful"} Mode
 * @typedef {"relaxed"|"tense"|"angry"} Phase
 * @typedef {Object<string, string>} ThemeChoice  Theme name per mode, only for the modes chosen.
 *
 * @typedef {Object} ConfigField  One key of ominous.json.
 * @property {string} key
 * @property {*} default  The value when the key is missing or invalid.
 * @property {string} description  One line, shown above the key in the printed config.
 * @property {Object<string, *>} schema  The JSON Schema fragment for the value.
 *
 * @typedef {Object} Config  ominous.json after normalizeConfig; every field has its default.
 * @property {string[]} calendars  Lowercased calendar names or ids; empty = every calendar.
 * @property {number} leadSeconds  How long before the start the card appears.
 * @property {?number} dim  Veil opacity 0..1, or null for the theme's.
 * @property {number} tenseSeconds  How long before the start the card turns tense.
 * @property {string} mode  "professional" or "playful".
 * @property {{professional: string, playful: string}} themes  Theme name per mode.
 * @property {boolean} onlyWithLink  Alert only for meetings with an https join link.
 *
 * @typedef {Object} AgendaEvent  One event of `omacal agenda --json` (untrusted input).
 * @property {string} eventId
 * @property {number} startMs
 * @property {number} endMs
 * @property {string} title
 * @property {string} location
 * @property {string} calendar
 * @property {string} calendarId
 * @property {string} conference  The join link, if any.
 * @property {boolean} allDay
 * @property {string} response  The user's answer, e.g. "declined".
 *
 * @typedef {Object} PhaseLook  One phase of a theme.
 * @property {string} color  A color token, or "" for the card's default.
 * @property {string} caption
 * @property {string[][]} frames  Sprite frames, each a list of text rows.
 * @property {number} frameMs
 * @property {boolean} shake
 *
 * @typedef {Object} Theme  A theme file after normalizeTheme.
 * @property {boolean} progress  Whether the card shows the progress line.
 * @property {Object<string, string>} palette  One character to a color token.
 * @property {number} cols
 * @property {number} rows
 * @property {Object<string, PhaseLook>} phases  One entry per Phase.
 *
 * @typedef {Object} ThemeFileState  What a watched theme file holds right now.
 * @property {string} status  "loading", "ok", "missing" or "invalid".
 * @property {?Theme} theme
 *
 * @typedef {Object} Payload  What the overlay shows, after normalizePayload.
 * @property {string} title
 * @property {number} startMs
 * @property {number} endMs
 * @property {string} location
 * @property {string} calendar
 * @property {string} url  An https link, or "".
 * @property {?number} dim
 * @property {number} leadSeconds
 * @property {number} tenseSeconds
 * @property {string} mode
 * @property {{professional: Theme, playful: Theme}} themes
 */

// ---------------------------------------------------------------- Values and links

/**
 * A number from a config or payload value. null, "" and booleans must not read as 0: a 0
 * tenseSeconds would silently drop the tense phase.
 *
 * @param {*} v Any value.
 * @returns {number} The number, or NaN for anything that is not a number or a numeric string.
 */
function numberOrNaN(v) {
  return typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN
}

/**
 * Whether a string is a valid theme name. Theme names end up in a file path, so only a plain
 * slug is accepted.
 *
 * @param {*} name The candidate name.
 * @returns {boolean}
 */
function isThemeName(name) {
  return typeof name === "string" && /^[a-z0-9_-]{1,40}$/.test(name)
}

/**
 * The link the card may open. Calendar data is third-party input: only a plain https URL is
 * ever opened.
 *
 * @param {*} url The link from the calendar or a payload.
 * @returns {string} The URL, or "" when it is not a plain https URL.
 */
function safeUrl(url) {
  var s = String(url || "")
  return /^https:\/\/[^\s\\]+$/i.test(s) ? s : ""
}

/**
 * The name of the meeting service behind a link, for the Join button.
 *
 * @param {*} url The join link.
 * @returns {string} "Meet", "Teams", "Zoom", "Webex", "Jitsi" or "Whereby"; "browser" for
 *     another https link; "" when there is no safe link.
 */
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

/**
 * Cleans a parsed ominous.json: every known key with a valid value is kept, everything else
 * gets its default.
 *
 * @param {*} raw The parsed file, or anything else.
 * @returns {Config}
 */
function normalizeConfig(raw) {
  /** @type {Config} */
  var cfg = {
    calendars: DEFAULTS.calendars.slice(), leadSeconds: DEFAULTS.leadSeconds, dim: DEFAULTS.dim,
    tenseSeconds: DEFAULTS.tenseSeconds, mode: DEFAULTS.mode,
    themes: { professional: DEFAULTS.themes.professional, playful: DEFAULTS.themes.playful },
    onlyWithLink: DEFAULTS.onlyWithLink
  }
  if (!raw || typeof raw !== "object") return cfg
  if (Array.isArray(raw.calendars))
    cfg.calendars = raw.calendars.map(function(/** @type {*} */ c) { return String(c).trim().toLowerCase() })
                                 .filter(function(/** @type {string} */ c) { return c !== "" })
  var lead = Number(raw.leadSeconds)
  if (isFinite(lead) && lead >= 0 && lead <= 3600) cfg.leadSeconds = Math.round(lead)
  var dim = raw.dim === null || raw.dim === undefined ? NaN : Number(raw.dim)
  if (isFinite(dim) && dim >= 0 && dim <= 1) cfg.dim = dim
  var tense = numberOrNaN(raw.tenseSeconds)
  if (isFinite(tense) && tense >= 0 && tense <= 3600) cfg.tenseSeconds = Math.round(tense)
  if (MODES.indexOf(raw.mode) >= 0) cfg.mode = raw.mode
  if (raw.themes && typeof raw.themes === "object")
    MODES.forEach(function(m) { if (isThemeName(raw.themes[m])) cfg.themes[m] = raw.themes[m] })
  if (raw.onlyWithLink === true) cfg.onlyWithLink = true
  return cfg
}

/**
 * Turns a config file with comments into plain JSON text: drops a leading UTF-8 byte order
 * mark, `//` comments up to the end of the line, and a comma that is followed only by white
 * space before a `]` or `}`. Text inside a string, `//` included, is left as it is.
 *
 * @param {string} text The file's content.
 * @returns {string} The same text without the above; a file that had none comes back unchanged.
 */
function stripJsonc(text) {
  var s = String(text)
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1)
  var out = ""
  var i = 0, j = 0
  // Pass 1: comments. A string runs to its closing quote; a backslash skips the next character.
  while (i < s.length) {
    if (s[i] === '"') {
      j = i + 1
      while (j < s.length && s[j] !== '"') j += s[j] === "\\" ? 2 : 1
      out += s.slice(i, j + 1)
      i = j + 1
    } else if (s[i] === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++
    } else {
      out += s[i]
      i++
    }
  }
  // Pass 2: trailing commas, on the text without comments.
  var res = ""
  i = 0
  while (i < out.length) {
    if (out[i] === '"') {
      j = i + 1
      while (j < out.length && out[j] !== '"') j += out[j] === "\\" ? 2 : 1
      res += out.slice(i, j + 1)
      i = j + 1
    } else if (out[i] === ",") {
      j = i + 1
      while (j < out.length && /\s/.test(out[j])) j++
      if (out[j] !== "]" && out[j] !== "}") res += ","
      i++
    } else {
      res += out[i]
      i++
    }
  }
  return res
}

/**
 * Reads ominous.json's text, which may hold comments and trailing commas. A missing file
 * (empty text) is fine; broken JSON gives defaults and an error. Top-level keys that Ominous
 * does not use are listed so the user can see a misspelling; `$schema` is for editors and is
 * not reported.
 *
 * @param {string} text The file's content.
 * @returns {{config: Config, error: string, unknownKeys: string[]}} The error is "" when the
 *     file parsed; unknownKeys is sorted.
 */
function parseConfig(text) {
  var raw = null, error = ""
  try { raw = JSON.parse(stripJsonc(text || "{}")) } catch (e) { error = "config parse failed, using defaults" }
  /** @type {string[]} */
  var unknownKeys = []
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    unknownKeys = Object.keys(raw).filter(function(/** @type {string} */ k) {
      return k !== "$schema" && !Object.prototype.hasOwnProperty.call(DEFAULTS, k)
    }).sort()
  return { config: normalizeConfig(raw), error: error, unknownKeys: unknownKeys }
}

/**
 * A value as JSON on one line, with a space after each comma and colon.
 *
 * @param {*} v A string, number, boolean, null, list or plain object.
 * @returns {string}
 */
function inlineJson(v) {
  if (Array.isArray(v)) return "[" + v.map(inlineJson).join(", ") + "]"
  if (v && typeof v === "object")
    return "{" + Object.keys(v).map(function(/** @type {string} */ k) { return " " + JSON.stringify(k) + ": " + inlineJson(v[k]) }).join(",") + (Object.keys(v).length ? " " : "") + "}"
  return JSON.stringify(v)
}

/**
 * The complete config as text for ominous.json: every key in the declaration's order, each
 * under a one-line comment, with the config's value. Reading it back gives the same config.
 *
 * @param {Config} config The effective config.
 * @param {string[]} unknownKeys Keys the user's file has that Ominous does not use.
 * @returns {string}
 */
function formatConfig(config, unknownKeys) {
  var cfg = /** @type {Object<string, *>} */ (/** @type {*} */ (config))
  var lines = [
    "// Ominous settings. Every key is optional: a missing key keeps its default.",
    "// Each key shows its current value: yours where you set one, the default otherwise. The mode and the",
    "// themes you choose on the card or with `theme` are kept in ~/.local/state/ominous instead,",
    "// and win over \"mode\" and \"themes\" below.",
    "// Every key is explained at " + CONFIG_DOCS_URL
  ]
  if (unknownKeys.length > 0)
    lines.push("// Unknown keys in your file, ignored: " + unknownKeys.join(", "))
  lines.push("{", "  " + JSON.stringify("$schema") + ": " + JSON.stringify(SCHEMA_URL) + ",")
  CONFIG_FIELDS.forEach(function(f, i) {
    lines.push("", "  // " + f.description,
               "  " + JSON.stringify(f.key) + ": " + inlineJson(cfg[f.key]) + (i < CONFIG_FIELDS.length - 1 ? "," : ""))
  })
  lines.push("}", "")
  return lines.join("\n")
}

/**
 * The JSON Schema of ominous.json, for editors: one property per declared key with its type,
 * range, default and description, and `$schema` allowed. Unknown keys are allowed too: Ominous
 * only warns about them, and an editor should not call them errors.
 *
 * @returns {Object<string, *>}
 */
function configSchema() {
  /** @type {Object<string, *>} */
  var properties = {
    "$schema": { type: "string", description: "Where this schema is published; editors use it, Ominous ignores it." }
  }
  CONFIG_FIELDS.forEach(function(f) {
    /** @type {Object<string, *>} */
    var p = {}
    for (var k in f.schema) p[k] = f.schema[k]
    p.default = f.default
    p.description = f.description
    properties[f.key] = p
  })
  return {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": SCHEMA_URL,
    title: "Ominous settings (ominous.json)",
    type: "object",
    properties: properties,
    additionalProperties: true
  }
}

/**
 * The mode in use. The mode saved by the switch wins over the config's; anything unreadable
 * is ignored.
 *
 * @param {*} stateRaw The state file's text, or an already parsed object; untrusted.
 * @param {Config} cfg The config.
 * @returns {string} "professional" or "playful".
 */
function resolveMode(stateRaw, cfg) {
  var st = stateRaw
  if (typeof st === "string") {
    try { st = JSON.parse(st) } catch (e) { st = null }
  }
  return st && typeof st === "object" && MODES.indexOf(st.mode) >= 0 ? st.mode : cfg.mode
}

/**
 * The theme per mode saved by the `theme` command. Anything unreadable counts as no choice.
 *
 * @param {*} saved The themes.json text, or an already parsed object; untrusted.
 * @returns {ThemeChoice} Only the modes with a valid saved name.
 */
function parseThemeOverrides(saved) {
  var raw = saved
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw) } catch (e) { raw = null }
  }
  /** @type {ThemeChoice} */
  var out = {}
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    MODES.forEach(function(m) { if (isThemeName(raw[m])) out[m] = raw[m] })
  return out
}

/**
 * The theme each mode uses: the saved choice, else ominous.json's (or its default).
 *
 * @param {*} saved The themes.json text or object; untrusted.
 * @param {Config} cfg The config.
 * @returns {{professional: string, playful: string}}
 */
function resolveThemes(saved, cfg) {
  var o = parseThemeOverrides(saved)
  return { professional: o.professional || cfg.themes.professional, playful: o.playful || cfg.themes.playful }
}

// ---------------------------------------------------------------- Agenda

/**
 * Whether an agenda event may raise an alert: timed, not declined, in a configured calendar,
 * and with a join link when `onlyWithLink` is set.
 *
 * @param {?AgendaEvent} ev The event.
 * @param {Config} cfg The config.
 * @returns {boolean}
 */
function isAlertable(ev, cfg) {
  if (!ev || ev.allDay || ev.response === "declined") return false
  if (!(Number(ev.startMs) > 0)) return false
  // The same rule as the Join button: only an https conference link counts.
  if (cfg.onlyWithLink && safeUrl(ev.conference) === "") return false
  if (cfg.calendars.length === 0) return true
  var name = String(ev.calendar || "").toLowerCase()
  var id = String(ev.calendarId)
  return cfg.calendars.indexOf(name) >= 0 || cfg.calendars.indexOf(id) >= 0
}

/**
 * The key that remembers an alert: the event and its start, so a moved meeting alerts again.
 *
 * @param {AgendaEvent} ev The event.
 * @returns {string}
 */
function eventKey(ev) {
  return String(ev.eventId) + ":" + String(ev.startMs)
}

/**
 * The earliest alertable event inside its alert window that has not fired yet.
 *
 * @param {AgendaEvent[]} events The agenda.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {Config} cfg The config.
 * @param {Object<string, number>} fired Keys of the alerts already shown.
 * @returns {?AgendaEvent} The event, or null.
 */
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

/**
 * The next event to alert for, marked in `fired` so it alerts once even though it stays in
 * its window.
 *
 * @param {AgendaEvent[]} events The agenda.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {Config} cfg The config.
 * @param {Object<string, number>} fired Keys of the alerts already shown; updated in place.
 * @returns {?AgendaEvent} The event, or null.
 */
function claimDue(events, nowMs, cfg, fired) {
  var ev = nextDue(events, nowMs, cfg, fired)
  if (ev) fired[eventKey(ev)] = Number(ev.startMs)
  return ev
}

/**
 * Forgets alerts older than a day, in place.
 *
 * @param {Object<string, number>} fired Alert keys to their start, epoch milliseconds.
 * @param {number} nowMs Now, epoch milliseconds.
 * @returns {Object<string, number>} The same object.
 */
function pruneFired(fired, nowMs) {
  var cutoff = nowMs - 24 * 3600 * 1000
  for (var k in fired)
    if (fired[k] < cutoff) delete fired[k]
  return fired
}

/**
 * What the `status` IPC says about the agenda: counts and times, never titles.
 *
 * @param {AgendaEvent[]} events The agenda.
 * @param {Config} cfg The config.
 * @param {number} nowMs Now, epoch milliseconds.
 * @returns {{events: number, upcomingAlertable: number, nextStart: ?string}} nextStart is an
 *     ISO time, or null.
 */
function statusSnapshot(events, cfg, nowMs) {
  var starts = (events || []).filter(function(ev) { return isAlertable(ev, cfg) && Number(ev.startMs) > nowMs })
                             .map(function(ev) { return Number(ev.startMs) })
  return { events: (events || []).length, upcomingAlertable: starts.length,
           nextStart: starts.length ? new Date(Math.min.apply(null, starts)).toISOString() : null }
}

// ---------------------------------------------------------------- Timing on the card

/**
 * Which phase the card is in: "relaxed" until `tenseSeconds` before the start, "tense" until
 * the start, "angry" from then on. A missing start never leaves "relaxed".
 *
 * @param {number} startMs Meeting start, epoch milliseconds.
 * @param {number} nowMs The moment to classify, epoch milliseconds.
 * @param {number} tenseSeconds How long before the start the card turns tense.
 * @returns {string} "relaxed", "tense" or "angry".
 */
function phase(startMs, nowMs, tenseSeconds) {
  var start = Number(startMs)
  if (!(start > 0)) return "relaxed"
  if (nowMs >= start) return "angry"
  return nowMs >= start - tenseSeconds * 1000 ? "tense" : "relaxed"
}

/**
 * The progress line's fill: before the start the share of the lead time already elapsed,
 * after it the share of the meeting already gone. No end time or no lead = full.
 *
 * @param {number} startMs Meeting start, epoch milliseconds.
 * @param {number} endMs Meeting end, epoch milliseconds, or 0.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {number} leadSeconds How long before the start the card appears.
 * @returns {number} 0..1.
 */
function progress(startMs, endMs, nowMs, leadSeconds) {
  var start = Number(startMs), end = Number(endMs), lead = leadSeconds * 1000
  var f
  if (nowMs < start) f = lead > 0 ? 1 - (start - nowMs) / lead : 1
  else f = end > start ? (nowMs - start) / (end - start) : 1
  return isFinite(f) ? Math.min(1, Math.max(0, f)) : 0
}

/**
 * The countdown text: "in 0:42", "now", "started 1:05 ago". Minutes are not capped at 59
 * because the lead time can be up to an hour.
 *
 * @param {number} startMs Meeting start, epoch milliseconds.
 * @param {number} nowMs Now, epoch milliseconds.
 * @returns {string}
 */
function countdown(startMs, nowMs) {
  var diff = Math.round((Number(startMs) - nowMs) / 1000)
  if (diff === 0) return "now"
  var abs = Math.abs(diff)
  var text = Math.floor(abs / 60) + ":" + ("0" + (abs % 60)).slice(-2)
  return diff > 0 ? "in " + text : "started " + text + " ago"
}

/**
 * Whether the meeting is over, so the card closes by itself.
 *
 * @param {number} endMs Meeting end, epoch milliseconds, or 0 when unknown.
 * @param {number} nowMs Now, epoch milliseconds.
 * @returns {boolean}
 */
function isOver(endMs, nowMs) {
  return endMs > 0 && nowMs >= endMs
}

// ---------------------------------------------------------------- Card input

/**
 * Whether input is still swallowed. Keys and clicks right after the card appears are
 * ignored: it grabs focus mid-typing, and an Enter already on its way must not join a
 * meeting that has not been read yet.
 *
 * @param {number} openedAtMs When the card opened, epoch milliseconds.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {number} guardMs How long input is ignored.
 * @returns {boolean}
 */
function isGuarded(openedAtMs, nowMs, guardMs) {
  return nowMs - openedAtMs < guardMs
}

/**
 * The button selected when the card opens. Join is only ever the default when there is a
 * link.
 *
 * @param {string} url The safe join link, or "".
 * @returns {number} 0 = Join, 1 = Dismiss.
 */
function initialSelection(url) {
  return url !== "" ? 0 : 1
}

/**
 * The button selected after Left, Right or Tab: they flip between the buttons, if there are
 * two.
 *
 * @param {number} selected 0 = Join, 1 = Dismiss.
 * @param {string} url The safe join link, or "".
 * @returns {number}
 */
function nextSelection(selected, url) {
  return url !== "" ? 1 - selected : selected
}

/**
 * What Enter does. Without a link it can only dismiss, whatever is selected.
 *
 * @param {number} selected 0 = Join, 1 = Dismiss.
 * @param {string} url The safe join link, or "".
 * @returns {string} "join" or "dismiss".
 */
function activation(selected, url) {
  return selected === 0 && url !== "" ? "join" : "dismiss"
}

// ---------------------------------------------------------------- Themes

/**
 * Checks a theme's pixel art. A sprite is a palette (one character to a color token) plus,
 * per phase, frames of equal-length text rows. Every frame of every phase shares one size,
 * so the card does not change shape as the phase moves.
 *
 * @param {*} rawPalette The theme's `palette`.
 * @param {Object<string, *>} rawPhases The theme's `phases`.
 * @returns {?{palette: Object<string, string>, cols: number, rows: number,
 *     frames: Object<string, string[][]>}} null when there is no sprite or it is malformed.
 */
function normalizeSprite(rawPalette, rawPhases) {
  if (!rawPalette || typeof rawPalette !== "object" || Array.isArray(rawPalette)) return null
  /** @type {Object<string, string>} */
  var palette = {}
  for (var key in rawPalette) {
    if (key.length !== 1) return null
    if (typeof rawPalette[key] === "string" && rawPalette[key].length <= 40) palette[key] = rawPalette[key]
  }
  /** @type {Object<string, string[][]>} */
  var frames = {}
  var cols = 0, rows = 0, any = false
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

/**
 * Cleans a parsed theme file. A bad sprite is dropped on its own; colors, captions and the
 * rest still apply. Missing colors stay "" for the overlay to fill in with its per-phase
 * defaults.
 *
 * @param {*} raw The parsed file.
 * @returns {?Theme} null if it is not an object.
 */
function normalizeTheme(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  var rawPhases = raw.phases && typeof raw.phases === "object" ? raw.phases : {}
  var sprite = normalizeSprite(raw.palette, rawPhases)
  /** @type {Theme} */
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

/**
 * Picks the theme to use from the three files a mode watches: the user's `<name>.json`, the
 * plugin's `<name>.json` and the plugin's default for the mode. A theme that is absent or
 * broken falls back to the mode's default and says so in `error`, and the alert never waits
 * on a theme (the last resort is an empty theme: plain defaults).
 *
 * @param {string} name The theme name asked for.
 * @param {ThemeFileState} user The user's file.
 * @param {ThemeFileState} shipped The plugin's file of that name.
 * @param {ThemeFileState} fallback The plugin's default for the mode.
 * @returns {{theme: ?Theme, error: string, pending: boolean}} pending while a file that
 *     decides is still loading.
 */
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

/**
 * The sprite frame to draw; the index may run past the end, or below zero.
 *
 * @param {string[][]} frames The phase's frames.
 * @param {number} index The frame counter.
 * @returns {?string[]} The frame's rows, or null when there are no frames.
 */
function frameAt(frames, index) {
  return frames && frames.length > 0 ? frames[((index % frames.length) + frames.length) % frames.length] : null
}

// ---------------------------------------------------------------- Theme commands
// `themes` lists, `theme "<name> [mode]"` chooses, `theme reset` forgets. The
// choice is saved in its own state file, which only the service writes.

/**
 * The themes on disk by name, sorted. A user file wins over a shipped one of the same name.
 * Files whose name is not a valid theme name are left out.
 *
 * @param {string[]} userFiles File names in the user's themes folder.
 * @param {string[]} shippedFiles File names in the plugin's themes folder.
 * @returns {{name: string, source: string}[]}
 */
function themeCatalog(userFiles, shippedFiles) {
  /** @type {Object<string, {user?: boolean, shipped?: boolean}>} */
  var byName = {}
  /**
   * Records the theme files of one folder.
   *
   * @param {string[]} files File names.
   * @param {"user"|"shipped"} where Which folder.
   */
  function add(files, where) {
    (files || []).forEach(function(/** @type {string} */ f) {
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

/**
 * The text `themes` prints: one line per theme, where it comes from, which mode uses it. A
 * theme a mode asks for but that is not on disk is listed too, as missing.
 *
 * @param {{name: string, source: string}[]} catalog From themeCatalog.
 * @param {{professional: string, playful: string}} effective The theme each mode uses.
 * @returns {string}
 */
function formatThemeList(catalog, effective) {
  var rows = catalog.map(function(t) { return { name: t.name, source: t.source } })
  MODES.forEach(function(m) {
    if (!rows.some(function(r) { return r.name === effective[m] }))
      rows.push({ name: effective[m], source: "missing: falls back to " + DEFAULTS.themes[m] })
  })
  var nameW = Math.max.apply(null, rows.map(function(r) { return r.name.length }))
  var srcW = Math.max.apply(null, rows.map(function(r) { return r.source.length }))
  /**
   * Pads a string with spaces to a width.
   *
   * @param {string} s The text.
   * @param {number} w The width.
   * @returns {string}
   */
  function pad(s, w) { while (s.length < w) s += " "; return s }
  return rows.map(function(r) {
    var users = MODES.filter(function(m) { return effective[m] === r.name })
    return (pad(r.name, nameW) + "  " + pad(r.source, srcW) + (users.length ? "  <- " + users.join(", ") : "")).replace(/\s+$/, "")
  }).join("\n")
}

/**
 * What `theme "<spec>"` means. Without a mode a theme goes to playful. `reset` is the command
 * word, so a theme called "reset" can only be chosen in ominous.json.
 *
 * @param {string} spec "<name> [mode]" or "reset [mode]".
 * @param {ThemeChoice} overrides The saved choice so far.
 * @param {string[]} available The theme names on disk.
 * @param {string} activeMode The mode the card is in.
 * @returns {{error: string}|{overrides: ThemeChoice, message: string}} The overrides are
 *     the new saved choice.
 */
function themeCommand(spec, overrides, available, activeMode) {
  var words = String(spec || "").trim().split(/\s+/).filter(function(w) { return w !== "" })
  if (words.length < 1 || words.length > 2) return { error: THEME_USAGE }
  var mode = words.length === 2 ? words[1] : ""
  if (mode !== "" && /** @type {string[]} */ (MODES).indexOf(mode) < 0) return { error: THEME_USAGE }
  /** @type {ThemeChoice} */
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

/**
 * The meeting part of a payload, from an OmaCal agenda event.
 *
 * @param {AgendaEvent} ev The event.
 * @returns {Object} title, startMs, endMs, location, calendar and a safe url.
 */
function eventPayload(ev) {
  return { title: String(ev.title || "Meeting"), startMs: Number(ev.startMs), endMs: Number(ev.endMs) || 0,
           location: String(ev.location || ""), calendar: String(ev.calendar || ""), url: safeUrl(ev.conference) }
}

/**
 * The look part of a payload: timing, dimming, the mode and both themes (already normalized).
 *
 * @param {Config} cfg The config.
 * @param {string} mode The mode in use.
 * @param {{professional: Theme, playful: Theme}} themes The theme of each mode.
 * @returns {Object}
 */
function look(cfg, mode, themes) {
  return { dim: cfg.dim, leadSeconds: cfg.leadSeconds, tenseSeconds: cfg.tenseSeconds, mode: mode, themes: themes }
}

/**
 * What the overlay makes of a payload. Anyone who can call the shell's IPC can summon it, so
 * every field is checked again and a bad one gets its default.
 *
 * @param {*} p The parsed payload.
 * @returns {Payload}
 */
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
    // normalizeTheme({}) is never null: an empty object is a valid, empty theme.
    themes: { professional: normalizeTheme(themes.professional) || /** @type {Theme} */ (normalizeTheme({})),
              playful: normalizeTheme(themes.playful) || /** @type {Theme} */ (normalizeTheme({})) }
  }
}

/**
 * The synthetic meeting of `preview "<phase> [mode] [title...]"`, which lands in one phase and
 * stays there. Relaxed and tense start ten minutes out, and tense stretches its threshold to
 * cover them, so the phase holds instead of lasting only tenseSeconds.
 *
 * @param {string} spec The command's argument.
 * @param {number} nowMs Now, epoch milliseconds.
 * @returns {{error: string}|{payload: Object, overrides: Object}} The overrides (mode,
 *     leadSeconds, tenseSeconds) replace the look's own.
 */
function previewPayload(spec, nowMs) {
  var words = String(spec || "").trim().split(/\s+/)
  var phase = words[0]
  if (/** @type {string[]} */ (PHASES).indexOf(phase) < 0) return { error: "usage: preview <relaxed|tense|angry> [professional|playful] [title...]" }
  var hasMode = /** @type {string[]} */ (MODES).indexOf(words[1]) >= 0
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
