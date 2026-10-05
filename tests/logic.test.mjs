// Run: node tests/logic.test.mjs
import { readFileSync } from "node:fs"
import vm from "node:vm"
import assert from "node:assert/strict"

const src = readFileSync(new URL("../Logic.js", import.meta.url), "utf8").replace(".pragma library", "")
const L = {}
vm.runInNewContext(src, L)

const cfg = L.normalizeConfig({ calendars: ["Work@Example.com"], leadSeconds: 60 })
const now = 1_000_000_000_000
const ev = (o) => ({ eventId: 1, calendar: "work@example.com", calendarId: 7, startMs: now + 30_000,
                     allDay: false, response: "accepted", ...o })

// config
assert.equal(L.normalizeConfig(null).calendars.length, 0)
assert.equal(L.normalizeConfig({ leadSeconds: -5 }).leadSeconds, 60)
assert.equal(L.normalizeConfig({ leadSeconds: 300 }).leadSeconds, 300)
assert.equal(L.normalizeConfig({}).dim, null)
assert.equal(L.normalizeConfig({ dim: 0.8 }).dim, 0.8)
assert.equal(L.normalizeConfig({ dim: 0 }).dim, 0)
assert.equal(L.normalizeConfig({ dim: 2 }).dim, null)

// filtering
assert.equal(L.isAlertable(ev({}), cfg), true)
assert.equal(L.isAlertable(ev({ calendar: "Family", calendarId: 1 }), cfg), false)
assert.equal(L.isAlertable(ev({ calendar: "x", calendarId: 7 }), L.normalizeConfig({ calendars: ["7"] })), true)
assert.equal(L.isAlertable(ev({ allDay: true }), cfg), false)
assert.equal(L.isAlertable(ev({ response: "declined" }), cfg), false)
assert.equal(L.isAlertable(ev({ calendar: "Family" }), L.normalizeConfig({})), true)

// window
assert.equal(L.nextDue([ev({ startMs: now + 61_000 })], now, cfg, {}), null)            // too early
assert.equal(L.nextDue([ev({ startMs: now + 60_000 })], now, cfg, {})?.eventId, 1)      // lead edge
assert.equal(L.nextDue([ev({ startMs: now - 119_000 })], now, cfg, {})?.eventId, 1)     // inside grace
assert.equal(L.nextDue([ev({ startMs: now - 120_000 })], now, cfg, {}), null)           // grace over
const a = ev({ eventId: 2, startMs: now + 50_000 }), b = ev({ eventId: 3, startMs: now + 10_000 })
assert.equal(L.nextDue([a, b], now, cfg, {}).eventId, 3)                                // earliest first
assert.equal(L.nextDue([a, b], now, cfg, { [L.eventKey(b)]: true }).eventId, 2)         // fired skipped

// urls
assert.equal(L.safeUrl("javascript:alert(1)"), "")
assert.equal(L.safeUrl("https://meet.google.com/a b"), "")
assert.equal(L.provider("https://meet.google.com/abc-defg-hij"), "Meet")
assert.equal(L.provider("https://acme.zoom.us/j/1"), "Zoom")
assert.equal(L.provider("https://evilzoom.us/j/1"), "browser")
assert.equal(L.provider(null), "")

// countdown
assert.equal(L.countdown(now + 42_000, now), "in 0:42")
assert.equal(L.countdown(now, now), "now")
assert.equal(L.countdown(now - 65_000, now), "started 1:05 ago")

console.log("logic: all checks passed")
