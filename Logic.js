.pragma library

// Every decision the plugin makes, as pure functions: no QML types, so the tests
// in tests/ run them under node, and Service.qml and Alert.qml stay glue.
//
//   Constants
//   Values and links ......... numberOrNaN, quoted, cleanText, isThemeName, safeUrl, hostOf, linkHost, displayHost, shortHost, checkHostList, hostList, hostIn, joinTarget, unknownLinkTip
//   Config and saved state ... checkConfig, normalizeConfig, stripJsonc, parseConfig, inlineJson, formatConfig, configSchema, resolveMode, parseThemeOverrides, resolveThemes
//   Agenda ................... isAlertable, isConfirmed, eventKey, nextDue, isDueNow, claimDue, pruneFired, statusSnapshot
//   Timing on the card ....... phase, progress, countdown, isOver
//   Card input ............... isGuarded, initialSelection, nextSelection, activation
//   Themes ................... normalizeSprite, normalizeTheme, pickTheme, frameAt
//   Theme commands ........... themeCatalog, formatThemeList, themeCommand
//   Payloads ................. eventPayload, look, normalizePayload, previewPayload

// ---------------------------------------------------------------- Constants

/**
 * The meeting services recognized by default, as (host, name): the narrowest host that covers
 * the service's meeting links. The host list below comes from the first column and the Join
 * button shows the name of a recognized host under one of them.
 */
var JOIN_SERVICES = [
  ["meet.google.com", "Meet"], ["zoom.us", "Zoom"], ["zoom.com", "Zoom"], ["zoomgov.com", "Zoom"],
  ["teams.microsoft.com", "Teams"], ["teams.live.com", "Teams"], ["teams.microsoft.us", "Teams"],
  ["teams.cloud.microsoft", "Teams"], ["webex.com", "Webex"], ["meet.jit.si", "Jitsi"],
  ["whereby.com", "Whereby"], ["gotomeeting.com", "GoTo"], ["meet.goto.com", "GoTo"],
  ["v.ringcentral.com", "RingCentral"], ["8x8.vc", "8x8"], ["meet.proton.me", "Proton Meet"],
  ["facetime.apple.com", "FaceTime"]
]

/** The hosts recognized when ominous.json has no joinHosts. */
var DEFAULT_JOIN_HOSTS = JOIN_SERVICES.map(function(e) { return e[0] })

/** Other meeting hosts, shown commented out in the printed config for the user to enable. */
var OPTIONAL_JOIN_HOSTS = [
  "meetings.ringcentral.com", "vc.larksuite.com", "vc.feishu.cn", "voovmeeting.com", "cliq.zoho.eu",
  "meeting.zoho.com",
  "call.lifesizecloud.com", "app.livestorm.com", "event.demio.com", "streamyard.com", "riverside.fm",
  "tuple.app", "meet.pumble.com", "join.gong.io", "go.chorus.ai", "doxy.me"
]

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
    schema: { type: "array", items: { type: ["string", "number"] } } },
  { key: "onlyWithLink", default: false,
    description: "true = alert only for meetings with an https join link.",
    schema: { type: "boolean" } },
  { key: "joinHosts", default: DEFAULT_JOIN_HOSTS, optional: OPTIONAL_JOIN_HOSTS,
    description: "Meeting hosts where Join is selected first (subdomains too); your list replaces this one. Recognized means the service, not the meeting.",
    schema: { type: "array", items: { type: "string", pattern: "^[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+\\.?$" } } },
  { key: "leadSeconds", default: 60,
    description: "Seconds before the start when the card appears (0-3600).",
    schema: { type: "number", minimum: 0, maximum: 3600 } },
  { key: "tenseSeconds", default: 15,
    description: "Seconds before the start when the card turns tense (0-3600); 0 = never.",
    schema: { type: "number", minimum: 0, maximum: 3600 } },
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
// Invitations the user has not confirmed that start within this of an alert share its card,
// so a flood of them gives at most one card a minute, however their starts are spread.
var GROUP_SECONDS = 60

var MAX_SPRITE = 32
// Frames per phase: the shipped themes use 3; a theme travels in every alert's payload.
var MAX_FRAMES = 64
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
 * @property {string[]} [optional]  Values of a list that are shown commented out, to enable.
 *
 * @typedef {Object} Config  ominous.json after normalizeConfig; every field has its default.
 * @property {string[]} calendars  Lowercased calendar names or ids; empty = every calendar.
 * @property {number} leadSeconds  How long before the start the card appears.
 * @property {?number} dim  Veil opacity 0..1, or null for the theme's.
 * @property {number} tenseSeconds  How long before the start the card turns tense.
 * @property {string} mode  "professional" or "playful".
 * @property {{professional: string, playful: string}} themes  Theme name per mode.
 * @property {boolean} onlyWithLink  Alert only for meetings with an https join link.
 * @property {string[]} joinHosts  Lowercase hosts whose links are recognized, subdomains included.
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
 * @property {boolean} organizer  Whether the user organizes it.
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
 * @property {string[]} joinHosts  The recognized join hosts.
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
 * A value as one short line of text for a log line or a comment: JSON text with every character
 * outside printable ASCII escaped (JSON.stringify leaves line separators and bidi controls
 * raw), cut at 40 characters with "…". It cannot end a `//` comment or forge a log line.
 *
 * @param {*} value A key name or any parsed JSON value.
 * @returns {string}
 */
function quoted(value) {
  var text = JSON.stringify(value)
  if (text === undefined) text = String(value)
  text = text.replace(/[^\x20-\x7e]/g, function(c) { return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4) })
  // Cut at 39 characters, but not in the middle of a \uXXXX escape.
  if (text.length <= 40) return text
  var cut = text.slice(0, 39).replace(/\\u[0-9a-f]{0,3}$/, "")
  // An odd run of backslashes at the end is half of a "\\" escape.
  var slashes = (/\\*$/.exec(cut) || [""])[0].length
  return (slashes % 2 ? cut.slice(0, -1) : cut) + "\u2026"
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
 * Calendar text for the card: line breaks, other control characters, line and paragraph
 * separators, text-direction marks and overrides and zero-width spaces become a space (the
 * zero-width joiners stay: emoji sequences need them), runs of white space collapse, and the
 * result is cut at `max` characters. A calendar's owner cannot stretch the card with line
 * breaks or reorder what is shown.
 *
 * @param {*} value The title, place or calendar name, or a theme caption.
 * @param {number} max The most characters to keep.
 * @returns {string} One line, possibly empty.
 */
function cleanText(value, max) {
  var text = String(value || "").replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/g, " ")
                                .replace(/\s+/g, " ").trim().slice(0, max)
  // Do not leave half of a surrogate pair at the cut.
  return /[\ud800-\udbff]$/.test(text) ? text.slice(0, -1) : text
}

/**
 * The link the card may open. Calendar data is third-party input: only a plain https URL is
 * ever opened.
 *
 * @param {*} url The link from the calendar or a payload.
 * @returns {string} The URL, or "" when it is not a plain https URL of at most 2048 characters
 *     with a host, or when it holds white space, a backslash, a control character or `$`: the
 *     browser is started through systemd, which expands `${VAR}` in its arguments, so a `$`
 *     could change the host the browser opens. A host with a `%` escape is refused too, since
 *     the browser would decode it into another host than the one shown, and so is `--private`
 *     anywhere: omarchy-launch-browser rewrites it inside every argument
 *     (`"${@/--private/$private_flag}"`), so `meet--private.example` would open
 *     `meet--incognito.example`.
 */
function safeUrl(url) {
  var s = String(url || "")
  if (s.length > 2048 || !/^https:\/\/[^\s\\\x00-\x1f\x7f-\x9f$]+$/i.test(s)) return ""
  if (s.indexOf("--private") >= 0) return ""
  var host = hostOf(s)
  return host !== "" && host.indexOf("%") < 0 ? s : ""
}

/**
 * The host part of an https link, without checking the rest: after `https://`, before the first
 * `/`, `?` or `#`, without user information up to the last `@`, without a port or trailing dots,
 * in lower case.
 *
 * @param {string} s A string that starts with `https://`.
 * @returns {string} The host, or "" when the link has none (`https:///x`, `https://user@/x`).
 */
function hostOf(s) {
  var m = /^https:\/\/([^\/?#]*)/i.exec(s)
  if (!m) return ""
  var authority = m[1]
  var host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d*$/, "")
  // A loop, not /\.+$/: that regex backtracks quadratically on a long run of dots.
  while (host.charAt(host.length - 1) === ".") host = host.slice(0, -1)
  return host.toLowerCase()
}

/**
 * The host a browser connects to for a link: after `https://`, before the first `/`, `?` or
 * `#`, without user information (everything up to the last `@`), without a port or a trailing
 * dot, in lower case. The same value is checked and shown, so what the user reads is what opens.
 *
 * @param {*} url The join link.
 * @returns {string} The host, or "" when there is no safe link.
 */
function linkHost(url) {
  return hostOf(safeUrl(url))
}

/**
 * A host as shown to the user: every character outside printable ASCII (right-to-left
 * overrides, invisible characters, letters of other alphabets) is written as its `\uXXXX`
 * escape, so that none can hide, reorder or imitate the others.
 *
 * @param {string} host A host from linkHost.
 * @returns {string} The host, with the escapes; the same text when it is plain ASCII.
 */
function displayHost(host) {
  return host.replace(/[^\x21-\x7e]/g, function(c) { return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4) })
}

/**
 * A text short enough for the Join button or the tooltip: a long one loses its start, since the
 * end of a host is what says whose it is.
 *
 * @param {string} text A host, usually from displayHost.
 * @param {number} max The most characters to keep.
 * @returns {string} The text, or "…" and at most its last `max` characters, never half of an escape.
 */
function shortHost(text, max) {
  if (text.length <= max) return text
  // Whole characters only: an escape cut in half would read as plain text.
  var parts = text.match(/\\u[0-9a-f]{4}|[\s\S]/g) || []
  var kept = ""
  for (var i = parts.length - 1; i >= 0 && kept.length + parts[i].length <= max; i--) kept = parts[i] + kept
  return "\u2026" + kept
}

/**
 * Cleans a list of hosts to recognize: entries trimmed, lower-cased, without a trailing dot, kept
 * only when they are plain host names with at least one dot, no duplicates.
 *
 * @param {*} raw The list from ominous.json or a payload.
 * @returns {{hosts: string[], rejected: *[]}} The valid hosts in their order, and the entries
 *     that are not host names; both empty when raw is not a list.
 */
function checkHostList(raw) {
  /** @type {string[]} */
  var hosts = []
  /** @type {*[]} */
  var rejected = []
  if (!Array.isArray(raw)) return { hosts: hosts, rejected: rejected }
  raw.forEach(function(/** @type {*} */ h) {
    var host = typeof h === "string" ? h.trim().toLowerCase().replace(/\.$/, "") : ""
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) rejected.push(h)
    else if (hosts.indexOf(host) < 0) hosts.push(host)
  })
  return { hosts: hosts, rejected: rejected }
}

/**
 * The valid hosts of a list from ominous.json or a payload (see checkHostList).
 *
 * @param {*} raw The list.
 * @returns {string[]} The hosts in their order; an empty list when raw is not a list.
 */
function hostList(raw) {
  return checkHostList(raw).hosts
}

/**
 * Whether a host is a listed host or a subdomain of one, at any depth.
 *
 * @param {string} host A host from linkHost.
 * @param {string[]} hosts The recognized hosts.
 * @returns {boolean}
 */
function hostIn(host, hosts) {
  return hosts.some(function(h) { return host === h || host.slice(-(h.length + 1)) === "." + h })
}

/**
 * What the Join button needs to know about a link.
 *
 * @param {*} url The join link.
 * @param {string[]} hosts The recognized hosts.
 * @returns {{host: string, recognized: boolean, label: string}} The host that opens; whether it
 *     is recognized; the button's name for it: the service name for a recognized host of a known
 *     service, else the host as displayHost shows it, shortened to 32 characters. All empty when
 *     there is no safe link.
 */
function joinTarget(url, hosts) {
  var host = linkHost(url)
  if (host === "") return { host: "", recognized: false, label: "" }
  // A host with anything but letters, digits, hyphens and dots (a leftover port, a % escape,
  // an invisible character) is never recognized, whatever it ends with.
  var recognized = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && hostIn(host, hosts)
  var label = shortHost(displayHost(host), 32)
  if (recognized)
    for (var i = 0; i < JOIN_SERVICES.length; i++)
      if (hostIn(host, [JOIN_SERVICES[i][0]])) { label = JOIN_SERVICES[i][1]; break }
  return { host: host, recognized: recognized, label: label }
}

/**
 * The tooltip of the "?" beside the Join button of an unrecognized link, in lines of at most 65
 * characters: the shell's tooltip does not wrap, so a longer line would stick out of the card.
 *
 * @param {string} host The link's host, as joinTarget gives it.
 * @returns {string} Plain text, five or seven lines; the host is escaped and cut at 64 characters.
 */
function unknownLinkTip(host) {
  var shown = displayHost(host)
  var lines = ["Link not recognized:", shortHost(shown, 64), "Add it to joinHosts in", "~/.config/omarchy/ominous.json",
               "to make Join the default for it."]
  if (shown !== host) lines.push("It has characters outside plain ASCII", "and may imitate another address.")
  return lines.join("\n")
}

// ---------------------------------------------------------------- Config and saved state

/**
 * Cleans a parsed ominous.json: every known key with a valid value is kept, everything else
 * gets its default, and each value that was refused is listed so the user can be told.
 * Normalizing a valid value (rounding, lower case, trimming) is not refusing it.
 *
 * @param {*} raw The parsed file, or anything else.
 * @returns {{config: Config, ignored: string[]}} Each ignored entry reads `<key>: <value>`, the
 *     value quoted; a nested key is written `themes.playful`.
 */
function checkConfig(raw) {
  /** @type {Config} */
  var cfg = {
    calendars: DEFAULTS.calendars.slice(), leadSeconds: DEFAULTS.leadSeconds, dim: DEFAULTS.dim,
    tenseSeconds: DEFAULTS.tenseSeconds, mode: DEFAULTS.mode,
    themes: { professional: DEFAULTS.themes.professional, playful: DEFAULTS.themes.playful },
    onlyWithLink: DEFAULTS.onlyWithLink, joinHosts: DEFAULTS.joinHosts.slice()
  }
  /** @type {string[]} */
  var ignored = []
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    // undefined is what a file that could not be parsed leaves; anything else parsed but is no
    // object.
    if (raw !== undefined) ignored.push("file: " + quoted(raw))
    return { config: cfg, ignored: ignored }
  }
  /** @param {string} key @param {*} value */
  var ignore = function(key, value) { ignored.push(key + ": " + quoted(value)) }
  var has = function(/** @type {string} */ k) { return raw[k] !== undefined }

  if (has("calendars")) {
    if (Array.isArray(raw.calendars)) {
      cfg.calendars = []
      raw.calendars.forEach(function(/** @type {*} */ c) {
        var name = typeof c === "string" || typeof c === "number" ? String(c).trim().toLowerCase() : ""
        if (name === "") ignore("calendars", c)
        else cfg.calendars.push(name)
      })
    } else ignore("calendars", raw.calendars)
  }
  var lead = numberOrNaN(raw.leadSeconds)
  if (isFinite(lead) && lead >= 0 && lead <= 3600) cfg.leadSeconds = Math.round(lead)
  else if (has("leadSeconds")) ignore("leadSeconds", raw.leadSeconds)
  var dim = numberOrNaN(raw.dim)
  if (isFinite(dim) && dim >= 0 && dim <= 1) cfg.dim = dim
  else if (has("dim") && raw.dim !== null) ignore("dim", raw.dim)
  var tense = numberOrNaN(raw.tenseSeconds)
  if (isFinite(tense) && tense >= 0 && tense <= 3600) cfg.tenseSeconds = Math.round(tense)
  else if (has("tenseSeconds")) ignore("tenseSeconds", raw.tenseSeconds)
  if (MODES.indexOf(raw.mode) >= 0) cfg.mode = raw.mode
  else if (has("mode")) ignore("mode", raw.mode)
  if (has("themes")) {
    if (raw.themes && typeof raw.themes === "object" && !Array.isArray(raw.themes))
      Object.keys(raw.themes).forEach(function(/** @type {string} */ m) {
        // The name comes from the file: anything but a plain word is shown quoted and escaped.
        if (MODES.indexOf(/** @type {Mode} */ (m)) < 0) ignore("themes." + (/^[\w-]+$/.test(m) ? m : quoted(m)), raw.themes[m])
        else if (isThemeName(raw.themes[m])) cfg.themes[/** @type {Mode} */ (m)] = raw.themes[m]
        else ignore("themes." + m, raw.themes[m])
      })
    else ignore("themes", raw.themes)
  }
  if (typeof raw.onlyWithLink === "boolean") cfg.onlyWithLink = raw.onlyWithLink
  else if (has("onlyWithLink")) ignore("onlyWithLink", raw.onlyWithLink)
  if (has("joinHosts")) {
    if (Array.isArray(raw.joinHosts)) {
      var checked = checkHostList(raw.joinHosts)
      cfg.joinHosts = checked.hosts
      checked.rejected.forEach(function(r) { ignore("joinHosts", r) })
    } else ignore("joinHosts", raw.joinHosts)
  }
  return { config: cfg, ignored: ignored }
}

/**
 * Cleans a parsed ominous.json (see checkConfig), without the list of refused values.
 *
 * @param {*} raw The parsed file, or anything else.
 * @returns {Config}
 */
function normalizeConfig(raw) {
  return checkConfig(raw).config
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
 * @returns {{config: Config, error: string, unknownKeys: string[], ignored: string[]}} The
 *     error is "" when the file parsed; unknownKeys is sorted; ignored lists the values that were
 *     refused (see checkConfig).
 */
function parseConfig(text) {
  // undefined when the text does not parse; a file that holds `null` is reported by checkConfig.
  /** @type {*} */
  var raw = undefined
  var error = ""
  // A file of nothing but comments and white space is an empty file.
  var stripped = stripJsonc(text || "{}")
  try { raw = JSON.parse(stripped.trim() === "" ? "{}" : stripped) } catch (e) { error = "config parse failed, using defaults" }
  /** @type {string[]} */
  var unknownKeys = []
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    unknownKeys = Object.keys(raw).filter(function(/** @type {string} */ k) {
      return k !== "$schema" && !Object.prototype.hasOwnProperty.call(DEFAULTS, k)
    }).sort()
  var checked = checkConfig(raw)
  return { config: checked.config, error: error, unknownKeys: unknownKeys, ignored: checked.ignored }
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
 * @param {string[]} ignored Values of the user's file that were refused (see checkConfig); may be left out.
 * @returns {string}
 */
function formatConfig(config, unknownKeys, ignored) {
  var cfg = /** @type {Object<string, *>} */ (/** @type {*} */ (config))
  var lines = [
    "// Ominous settings. Every key is optional: a missing key keeps its default.",
    "// Each key shows its current value: yours where you set one, the default otherwise. The mode and the",
    "// themes you choose on the card or with `theme` are kept in ~/.local/state/ominous instead,",
    "// and win over \"mode\" and \"themes\" below.",
    "// Every key is explained at " + CONFIG_DOCS_URL
  ]
  if (unknownKeys.length > 0)
    lines.push("// Unknown keys in your file, ignored: " + unknownKeys.map(function(k) { return quoted(k) }).join(", "))
  if (ignored && ignored.length > 0)
    lines.push("// Values in your file that were ignored, so the default is used: " + ignored.join("; "))
  lines.push("{", "  " + JSON.stringify("$schema") + ": " + JSON.stringify(SCHEMA_URL) + ",")
  CONFIG_FIELDS.forEach(function(f, i) {
    var comma = i < CONFIG_FIELDS.length - 1 ? "," : ""
    lines.push("")
    lines.push("  // " + f.description)
    if (f.optional) {
      var active = /** @type {string[]} */ (cfg[f.key])
      lines.push("  " + JSON.stringify(f.key) + ": [")
      active.forEach(function(v) { lines.push("    " + JSON.stringify(v) + ",") })
      f.optional.forEach(function(v) { if (active.indexOf(v) < 0) lines.push("    // " + JSON.stringify(v) + ",") })
      lines.push("  ]" + comma)
    } else {
      lines.push("  " + JSON.stringify(f.key) + ": " + inlineJson(cfg[f.key]) + comma)
    }
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
    if (f.optional) p.examples = f.optional.slice()
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
  // A start a Date can hold: status prints it with toISOString, which throws beyond 8.64e15.
  var start = Number(ev.startMs)
  if (!(start > 0 && start <= 8.64e15)) return false
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
 * Whether the user confirmed an event: accepted it or organizes it. Anyone can send an
 * invitation; only a confirmed event is sure to be the user's own.
 *
 * @param {AgendaEvent} ev The event.
 * @returns {boolean}
 */
function isConfirmed(ev) {
  return ev.response === "accepted" || ev.organizer === true
}

/**
 * The earliest alertable event inside its alert window that has not fired yet; at the same
 * start, a confirmed one first, so an invitation cannot take a real meeting's place.
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
    if (fired[eventKey(ev)] || !isDueNow(ev, nowMs, cfg)) continue
    var start = Number(ev.startMs), bestStart = best ? Number(best.startMs) : 0
    if (!best || start < bestStart || (start === bestStart && isConfirmed(ev) && !isConfirmed(best))) best = ev
  }
  return best
}

/**
 * Whether an event is alertable and inside its alert window: from `leadSeconds` before its
 * start to the end of the grace after it.
 *
 * @param {AgendaEvent} ev The event.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {Config} cfg The config.
 * @returns {boolean}
 */
function isDueNow(ev, nowMs, cfg) {
  if (!isAlertable(ev, cfg)) return false
  var start = Number(ev.startMs)
  return nowMs >= start - cfg.leadSeconds * 1000 && nowMs < start + GRACE_SECONDS * 1000
}

/**
 * The next event to alert for, marked in `fired` so it alerts once even though it stays in
 * its window. Every alertable event the user has not confirmed that starts within
 * GROUP_SECONDS after it is marked too: one card per group, so a flood of invitations cannot
 * take the keyboard every five seconds, however their starts are spread. A confirmed event
 * always gets its own card.
 *
 * @param {AgendaEvent[]} events The agenda.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {Config} cfg The config.
 * @param {Object<string, number>} fired Keys of the alerts already shown; updated in place.
 * @returns {?AgendaEvent} The event, or null.
 */
function claimDue(events, nowMs, cfg, fired) {
  var ev = nextDue(events, nowMs, cfg, fired)
  if (!ev) return null
  var start = Number(ev.startMs)
  fired[eventKey(ev)] = start
  for (var i = 0; i < events.length; i++) {
    var other = events[i], s = Number(other.startMs)
    if (isAlertable(other, cfg) && !isConfirmed(other) && s >= start && s < start + GROUP_SECONDS * 1000)
      fired[eventKey(other)] = s
  }
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
           nextStart: starts.length ? new Date(starts.reduce(function(a, b) { return Math.min(a, b) })).toISOString() : null }
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
 * ignored: it grabs focus mid-typing, and an Enter or a space already on its way must not join
 * or dismiss a meeting that has not been read yet. A key pressed while guarded starts the guard
 * again, so someone still typing stays guarded until they pause for `guardMs`.
 *
 * @param {number} openedAtMs When the card opened, epoch milliseconds.
 * @param {number} lastKeyMs When the last key swallowed by the guard was pressed, or 0.
 * @param {number} nowMs Now, epoch milliseconds.
 * @param {number} guardMs How long input is ignored, and how long a pause ends the guard.
 * @returns {boolean}
 */
function isGuarded(openedAtMs, lastKeyMs, nowMs, guardMs) {
  return nowMs - Math.max(openedAtMs, lastKeyMs) < guardMs
}

/**
 * The button selected when the card opens. Join is the default only for a link to a recognized
 * host; Enter on any other card dismisses it.
 *
 * @param {string} url The safe join link, or "".
 * @param {boolean} recognized Whether the link's host is recognized (joinTarget).
 * @returns {number} 0 = Join, 1 = Dismiss.
 */
function initialSelection(url, recognized) {
  return url !== "" && recognized ? 0 : 1
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
    if (!Array.isArray(rawFrames) || rawFrames.length === 0 || rawFrames.length > MAX_FRAMES) return null
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
    var caption = typeof p.caption === "string" || typeof p.caption === "number" ? cleanText(String(p.caption), 80) : ""
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
 * @returns {Object} title, startMs, endMs, location, calendar (each as one cleaned line) and a safe url.
 */
function eventPayload(ev) {
  return { title: cleanText(ev.title, 200) || "Meeting", startMs: Number(ev.startMs), endMs: Number(ev.endMs) || 0,
           location: cleanText(ev.location, 200), calendar: cleanText(ev.calendar, 80), url: safeUrl(ev.conference) }
}

/**
 * The look part of a payload: timing, dimming, the mode, both themes (already normalized) and
 * the recognized join hosts.
 *
 * @param {Config} cfg The config.
 * @param {string} mode The mode in use.
 * @param {{professional: Theme, playful: Theme}} themes The theme of each mode.
 * @returns {Object}
 */
function look(cfg, mode, themes) {
  return { dim: cfg.dim, leadSeconds: cfg.leadSeconds, tenseSeconds: cfg.tenseSeconds, mode: mode, themes: themes,
           joinHosts: cfg.joinHosts }
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
    title: cleanText(p.title, 200) || "Meeting", startMs: Number(p.startMs) || 0, endMs: Number(p.endMs) || 0,
    location: cleanText(p.location, 200), calendar: cleanText(p.calendar, 80), url: safeUrl(p.url),
    // The config's ranges again: a payload can come from any caller of the shell's IPC.
    dim: typeof p.dim === "number" && p.dim >= 0 && p.dim <= 1 ? p.dim : null,
    leadSeconds: isFinite(lead) && lead >= 0 && lead <= 3600 ? lead : DEFAULTS.leadSeconds,
    tenseSeconds: isFinite(tense) && tense >= 0 && tense <= 3600 ? tense : DEFAULTS.tenseSeconds,
    mode: p.mode === "playful" ? "playful" : "professional",
    joinHosts: Array.isArray(p.joinHosts) ? hostList(p.joinHosts) : DEFAULTS.joinHosts.slice(),
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
