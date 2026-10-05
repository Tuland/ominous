.pragma library

// Pure helpers shared by Service.qml and Alert.qml. Kept free of QML types so
// tests/logic.test.mjs can run them under node.

var DEFAULTS = {
  calendars: [],      // calendar names or ids; empty = every calendar
  leadSeconds: 60,
  dim: null           // 0..1 opacity of the veil behind the card; null = theme's menu scrim
}

// A meeting that started at most this long ago still alerts: covers a
// suspend, a shell restart or an OmaCal sync that lands a little late.
var GRACE_SECONDS = 120

function normalizeConfig(raw) {
  var cfg = { calendars: DEFAULTS.calendars.slice(), leadSeconds: DEFAULTS.leadSeconds, dim: DEFAULTS.dim }
  if (!raw || typeof raw !== "object") return cfg
  if (Array.isArray(raw.calendars))
    cfg.calendars = raw.calendars.map(function(c) { return String(c).trim().toLowerCase() })
                                 .filter(function(c) { return c !== "" })
  var lead = Number(raw.leadSeconds)
  if (isFinite(lead) && lead >= 0 && lead <= 3600) cfg.leadSeconds = Math.round(lead)
  var dim = raw.dim === null || raw.dim === undefined ? NaN : Number(raw.dim)
  if (isFinite(dim) && dim >= 0 && dim <= 1) cfg.dim = dim
  return cfg
}

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

// "in 0:42", "now", "started 1:05 ago". Minutes are not capped at 59 because
// the lead time can be up to an hour.
function countdown(startMs, nowMs) {
  var diff = Math.round((Number(startMs) - nowMs) / 1000)
  if (diff === 0) return "now"
  var abs = Math.abs(diff)
  var text = Math.floor(abs / 60) + ":" + ("0" + (abs % 60)).slice(-2)
  return diff > 0 ? "in " + text : "started " + text + " ago"
}
