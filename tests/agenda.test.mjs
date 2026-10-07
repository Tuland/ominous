// Which meetings alert, once, and what status says about them.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L, cfg, now, ev } from "./helpers.mjs"

describe("agenda", () => {
  test("filtering", () => {
    assert.equal(L.isAlertable(ev({}), cfg), true)
    assert.equal(L.isAlertable(ev({ calendar: "Family", calendarId: 1 }), cfg), false)
    assert.equal(L.isAlertable(ev({ calendar: "x", calendarId: 7 }), L.normalizeConfig({ calendars: ["7"] })), true)
    assert.equal(L.isAlertable(ev({ allDay: true }), cfg), false)
    assert.equal(L.isAlertable(ev({ response: "declined" }), cfg), false)
    assert.equal(L.isAlertable(ev({ calendar: "Family" }), L.normalizeConfig({})), true)
  })

  test("alert window", () => {
    assert.equal(L.nextDue([ev({ startMs: now + 61_000 })], now, cfg, {}), null)            // too early
    assert.equal(L.nextDue([ev({ startMs: now + 60_000 })], now, cfg, {})?.eventId, 1)      // lead edge
    assert.equal(L.nextDue([ev({ startMs: now - 119_000 })], now, cfg, {})?.eventId, 1)     // inside grace
    assert.equal(L.nextDue([ev({ startMs: now - 120_000 })], now, cfg, {}), null)           // grace over
    const a = ev({ eventId: 2, startMs: now + 50_000 }), b = ev({ eventId: 3, startMs: now + 10_000 })
    assert.equal(L.nextDue([a, b], now, cfg, {}).eventId, 3)                                // earliest first
    assert.equal(L.nextDue([a, b], now, cfg, { [L.eventKey(b)]: true }).eventId, 2)         // fired skipped
  })

  test("urls are https only", () => {
    assert.equal(L.safeUrl("javascript:alert(1)"), "")
    assert.equal(L.safeUrl("https://meet.google.com/a b"), "")
  })

  test("countdown text", () => {
    assert.equal(L.countdown(now + 42_000, now), "in 0:42")
    assert.equal(L.countdown(now, now), "now")
    assert.equal(L.countdown(now - 65_000, now), "started 1:05 ago")
  })
})

describe("alerting once", () => {
  test("a meeting alerts once, then not again", () => {
    const fired = {}
    const e = ev({ startMs: now + 30_000 })
    assert.equal(L.claimDue([e], now, cfg, fired)?.eventId, 1)
    assert.equal(L.claimDue([e], now + 5_000, cfg, fired), null)
    assert.equal(Object.keys(fired).length, 1)
  })

  test("a rescheduled meeting alerts again", () => {
    const fired = {}
    assert.ok(L.claimDue([ev({ startMs: now + 30_000 })], now, cfg, fired))
    assert.ok(L.claimDue([ev({ startMs: now + 50_000 })], now, cfg, fired))                 // same event id, new start
  })

  test("nothing due leaves no trace", () => {
    const fired = {}
    assert.equal(L.claimDue([ev({ startMs: now + 600_000 })], now, cfg, fired), null)
    assert.equal(Object.keys(fired).length, 0)
  })

  test("entries older than a day are forgotten, recent ones kept", () => {
    const day = 24 * 3600 * 1000
    const fired = { old: now - day - 1, edge: now - day, recent: now - 1000 }
    L.pruneFired(fired, now)
    assert.deepEqual(Object.keys(fired).sort(), ["edge", "recent"])
  })
})

describe("status", () => {
  test("counts and the next start, never a title", () => {
    const events = [ev({ eventId: 1, title: "TOP SECRET plan", startMs: now + 50_000 }),
                    ev({ eventId: 2, title: "Another secret", startMs: now + 20_000 }),
                    ev({ eventId: 3, title: "Past secret", startMs: now - 5_000 }),
                    ev({ eventId: 4, title: "Declined secret", startMs: now + 30_000, response: "declined" })]
    const s = L.statusSnapshot(events, cfg, now)
    assert.equal(s.events, 4)
    assert.equal(s.upcomingAlertable, 2)
    assert.equal(s.nextStart, new Date(now + 20_000).toISOString())
    assert.doesNotMatch(JSON.stringify(s), /secret/i)
  })

  test("nothing upcoming, or no agenda yet", () => {
    assert.equal(L.statusSnapshot([], cfg, now).nextStart, null)
    assert.equal(L.statusSnapshot([], cfg, now).upcomingAlertable, 0)
    assert.equal(L.statusSnapshot(undefined, cfg, now).events, 0)
  })
})

describe("only meetings with a join link", () => {
  const withLink = L.normalizeConfig({ onlyWithLink: true })
  const link = "https://meet.google.com/abc-defg-hij"

  test("off by default, and only true turns it on", () => {
    assert.equal(L.normalizeConfig(null).onlyWithLink, false)
    assert.equal(withLink.onlyWithLink, true)
    for (const v of ["yes", "true", 1, null, {}, []]) assert.equal(L.normalizeConfig({ onlyWithLink: v }).onlyWithLink, false, JSON.stringify(v))
  })

  test("off: a meeting without a link still alerts", () => {
    assert.equal(L.isAlertable(ev({}), L.normalizeConfig({})), true)
  })

  test("on: only an https conference link counts", () => {
    assert.equal(L.isAlertable(ev({ conference: link }), withLink), true)
    assert.equal(L.isAlertable(ev({}), withLink), false)
    assert.equal(L.isAlertable(ev({ conference: "" }), withLink), false)
    assert.equal(L.isAlertable(ev({ conference: "http://example.com/call" }), withLink), false)
    assert.equal(L.isAlertable(ev({ location: link }), withLink), false)                    // a link only in the location
  })

  test("on: the other rules still apply", () => {
    assert.equal(L.isAlertable(ev({ conference: link, allDay: true }), withLink), false)
    assert.equal(L.isAlertable(ev({ conference: link, response: "declined" }), withLink), false)
  })

  test("on: status counts and alerts follow the same rule", () => {
    const events = [ev({ eventId: 1, startMs: now + 30_000 }), ev({ eventId: 2, startMs: now + 40_000, conference: link })]
    assert.equal(L.statusSnapshot(events, withLink, now).upcomingAlertable, 1)
    assert.equal(L.nextDue(events, now, { ...withLink, leadSeconds: 60 }, {})?.eventId, 2)
  })
})

describe("status with a huge agenda", () => {
  test("the next start of 200000 events is found without a stack overflow", () => {
    const events = Array.from({ length: 200000 }, (_, i) => ev({ eventId: i, startMs: now + 60_000 + i }))
    assert.equal(L.statusSnapshot(events, cfg, now).nextStart, new Date(now + 60_000).toISOString())
  })
})
