// Which meetings alert, once, and what status says about them.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L, cfg, now, ev } from "./helpers.mjs"
import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

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

  // Invitations nobody answered, as a stranger's would be.
  const invite = (o) => ev({ response: "needsAction", organizer: false, ...o })
  const alertsOver = (events, seconds) => {
    const fired = {}, shown = []
    for (let t = -60_000; t <= seconds * 1000; t += 5_000) {
      const e = L.claimDue(events, now + t, cfg, fired)
      if (e) shown.push(e.eventId)
    }
    return shown
  }

  test("one card per group: a flood of same-minute invitations alerts once", () => {
    assert.equal(alertsOver(Array.from({ length: 50 }, (_, i) => invite({ eventId: i, startMs: now })), 300).length, 1)
  })

  test("invitations spread a few seconds apart give at most one card a minute", () => {
    for (const step of [1_000, 5_000, 30_000, 59_000]) {
      const flood = Array.from({ length: 40 }, (_, i) => invite({ eventId: i, startMs: now + i * step }))
      const span = 39 * step / 1000
      assert.ok(alertsOver(flood, span + 120).length <= Math.ceil(span / 60) + 1, "step " + step)
    }
  })

  test("an accepted or organized meeting always gets its own card, and goes first", () => {
    const real = ev({ eventId: "real", startMs: now + 10_000 }), mine = ev({ eventId: "mine", response: "needsAction", organizer: true, startMs: now + 20_000 })
    const spam = Array.from({ length: 5 }, (_, i) => invite({ eventId: "spam" + i, startMs: now + i * 1_000 }))
    const shown = alertsOver([...spam, real, mine], 120)
    assert.ok(shown.includes("real") && shown.includes("mine"), String(shown))
    const tie = alertsOver([invite({ eventId: "spam", startMs: now }), ev({ eventId: "real", startMs: now })], 120)
    assert.equal(tie[0], "real")
  })

  test("a meeting in its grace does not swallow the next one", () => {
    const late = invite({ eventId: "late", startMs: now - 90_000 }), next = invite({ eventId: "next", startMs: now + 40_000 })
    const fired = {}
    assert.equal(L.claimDue([late, next], now, cfg, fired)?.eventId, "late")
    assert.equal(L.claimDue([late, next], now + 5_000, cfg, fired)?.eventId, "next")
  })

  test("a meeting that enters its window later still alerts", () => {
    const fired = {}
    const ten = ev({ eventId: 1, startMs: now + 30_000 }), later = ev({ eventId: 2, startMs: now + 30 * 60_000 })
    assert.equal(L.claimDue([ten, later], now, cfg, fired)?.eventId, 1)
    assert.equal(L.claimDue([ten, later], now + 29 * 60_000 + 30_000, cfg, fired)?.eventId, 2)
  })

  test("a start a Date cannot hold is not alertable, and status still answers", () => {
    for (const startMs of [1e300, "1e400", Infinity, 8.64e15 + 1])
      assert.equal(L.isAlertable(ev({ startMs }), cfg), false, String(startMs))
    assert.doesNotThrow(() => L.statusSnapshot([ev({ startMs: 1e300 })], cfg, now))
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
  test("an entry that is not an object is skipped, the others still alert", () => {
    const fired = {}
    const events = [null, 7, "x", ev({ eventId: 1, startMs: now + 30_000 })]
    assert.equal(L.claimDue(events, now, cfg, fired)?.eventId, 1)
    assert.equal(L.claimDue(events, now + 5_000, cfg, fired), null)
  })

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

describe("agenda read", () => {
  const MAX = 1048576
  // A valid agenda JSON padded with spaces to exactly n bytes.
  const padded = (n) => { const s = JSON.stringify({ data: [ev({})] }); return s + " ".repeat(n - s.length) }
  const prev = [ev({ eventId: 99 })]

  test("exactly 1 MiB of valid JSON is read", () => {
    const r = L.readAgenda(prev, padded(MAX), 0)
    assert.equal(r.error, "")
    assert.equal(r.events.length, 1)
  })

  test("one byte more is too large, whatever the exit code", () => {
    const r = L.readAgenda(prev, padded(MAX + 1), 141)
    assert.equal(r.error, "agenda too large")
    assert.equal(r.events, prev)
  })

  test("multi-byte text under the limit in characters but over it in bytes is too large", () => {
    const text = "è".repeat(MAX / 2 + 1)          // 524289 characters, 1048578 bytes
    assert.ok(text.length < MAX)
    assert.equal(L.readAgenda(prev, text, 0).error, "agenda too large")
    assert.equal(L.readAgenda(prev, "\u{1F600}".repeat(MAX / 4 + 1), 0).error, "agenda too large")   // 4-byte characters
  })

  test("a sequence cut by the limit (U+FFFD) counts as over it", () => {
    const text = "a".repeat(MAX - 2) + "�"          // 1048574 + 3 bytes
    assert.equal(L.readAgenda(prev, text, 141).error, "agenda too large")
  })

  test("a failed command, broken JSON and an odd shape", () => {
    const failed = L.readAgenda(prev, "", 127)
    assert.equal(failed.error, "omacal exited with 127")
    assert.equal(failed.events, prev)
    const broken = L.readAgenda(prev, "{nope", 0)
    assert.equal(broken.error, "unreadable omacal output")
    assert.equal(broken.events, prev)
    assert.equal(JSON.stringify(L.readAgenda(prev, '{"data": 3}', 0)), '{"events":[],"error":""}')
    assert.equal(JSON.stringify(L.readAgenda(prev, "null", 0)), '{"events":[],"error":""}')
  })

  test("after an oversize read the previous meeting still alerts, and a good read clears the error", () => {
    const meeting = ev({ eventId: 5, startMs: now + 30_000 })
    let r = L.readAgenda([], JSON.stringify({ data: [meeting] }), 0)
    assert.equal(r.error, "")
    r = L.readAgenda(r.events, "x".repeat(MAX + 1), 141)
    assert.equal(r.error, "agenda too large")
    assert.equal(L.claimDue(r.events, now, cfg, {})?.eventId, 5)
    r = L.readAgenda(r.events, JSON.stringify({ data: [] }), 0)
    assert.equal(JSON.stringify(r), '{"events":[],"error":""}')
  })
})

describe("agenda command", () => {
  // Runs the service's command with a PATH holding only the given tools.
  const run = (tools, omacalBody) => {
    const dir = mkdtempSync(join(tmpdir(), "ominous-agenda-"))
    try {
      for (const t of tools) {
        if (t === "omacal") { writeFileSync(join(dir, "omacal"), "#!/bin/bash\n" + omacalBody + "\n"); chmodSync(join(dir, "omacal"), 0o755) }
        else symlinkSync(execFileSync("bash", ["-c", "command -v " + t], { encoding: "utf8" }).trim(), join(dir, t))
      }
      // bash itself is found through the test's own PATH; the command finds the rest in `dir`.
      const bash = execFileSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).trim()
      const r = spawnSync(bash, L.AGENDA_COMMAND.slice(1), { env: { PATH: dir }, maxBuffer: 8 << 20 })
      return { bytes: r.stdout.length, code: r.status }
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }

  test("is bash, with head bounding the read, and the service runs it", () => {
    assert.equal(L.AGENDA_COMMAND[0], "bash")
    assert.match(L.AGENDA_COMMAND[2], /\| head -c 1048577$/)
    const service = readFileSync(new URL("../Service.qml", import.meta.url), "utf8")
    assert.match(service, /^\s*command: Logic\.AGENDA_COMMAND$/m)
    assert.doesNotMatch(service, /"omacal"/)
  })

  test("2 MiB from OmaCal: the shell gets 1 MiB + 1 byte and exit 141", () => {
    const r = run(["omacal", "head", "cat"], "head -c 2097152 /dev/zero")
    assert.equal(r.bytes, 1048577)
    assert.equal(r.code, 141)
  })

  test("exactly 1 MiB: all of it, exit 0", () => {
    const r = run(["omacal", "head"], "head -c 1048576 /dev/zero")
    assert.deepEqual(r, { bytes: 1048576, code: 0 })
  })

  test("no omacal, or no head: exit 127", () => {
    assert.equal(run(["head"], "").code, 127)
    assert.equal(run(["omacal"], "echo '{}'").code, 127)
  })
})

describe("the open card follows its meeting", () => {
  const base = (o) => ev({ title: "Sync", endMs: now + 1_800_000, location: "Room 4", conference: "https://meet.google.com/abc",
                           recurring: false, ...o })
  const shown = (o, c = cfg) => L.shownFor(base(o), c)
  const follow = (s, events, open = true) => L.followShown(s, open, events, now)

  test("nothing to follow, a dismissed card, an unchanged meeting", () => {
    assert.equal(follow(null, [base({})]).action, "keep")
    assert.equal(follow(shown({}), [base({ title: "Other" })], false).action, "forget")
    assert.equal(follow(shown({}), [base({})]).action, "keep")
    assert.equal(follow(shown({}), [base({ attendees: 9, organizer: true })]).action, "keep")   // fields the card ignores
  })

  test("the shell cannot tell whether the card is open: close on any change, keep otherwise", () => {
    assert.equal(follow(shown({}), [base({ title: "Other" })], null).action, "close")
    assert.equal(follow(shown({}), [], null).action, "close")
    assert.equal(follow(shown({}), [base({})], null).action, "keep")
  })

  test("each changed card field is named, in a fixed order", () => {
    const cases = [[{ title: "New" }, ["title"]], [{ endMs: now + 3_600_000 }, ["end"]], [{ location: "Room 9" }, ["place"]],
                   [{ calendar: "Work@example.com" }, ["calendar"]], [{ conference: "https://meet.google.com/xyz" }, ["link"]],
                   [{ conference: "https://zoom.us/j/1", title: "New" }, ["title", "link"]]]
    for (const [change, fields] of cases) {
      const r = follow(shown({}), [base(change)])
      assert.equal(r.action, "update", JSON.stringify(change))
      assert.equal(r.payload.notice.kind, "changed")
      assert.deepEqual([...r.payload.notice.fields], fields)
      assert.equal(r.payload.url, L.safeUrl(base(change).conference))
      assert.equal(r.next.key, L.eventKey(base(change)))
    }
  })

  test("after an update, the next refresh keeps, even after a config change", () => {
    const first = shown({})
    const r = follow(first, [base({ conference: "https://evil.example/x" })])
    assert.equal(r.next.cfg, first.cfg)
    assert.equal(follow(r.next, [base({ conference: "https://evil.example/x" })]).action, "keep")
  })

  test("the config at open decides alertability: a later config change keeps the card", () => {
    const s = shown({})
    // The user drops the meeting's calendar after the card opened: under the new config the
    // meeting would not alert, yet the card keeps, because shown.cfg (the config at open) decides.
    const later = L.normalizeConfig({ calendars: ["other@example.com"], leadSeconds: 60 })
    assert.equal(L.isAlertable(base({}), later), false)
    assert.equal(L.isAlertable(base({}), s.cfg), true)
    assert.equal(follow(s, [base({})]).action, "keep")
    const onlyLink = L.normalizeConfig({ onlyWithLink: true })
    assert.equal(follow(shown({}, onlyLink), [base({ conference: "http://insecure.example/x" })]).payload.notice.kind, "removed")
  })

  test("over, removed, declined, no longer alerting", () => {
    assert.equal(follow(shown({}), [base({ endMs: now - 1 })]).action, "close")
    const gone = follow(shown({}), [])
    assert.equal(gone.payload.notice.kind, "removed")
    assert.equal(gone.payload.notice.closeInSeconds, 15)
    assert.equal(gone.payload.url, "")
    assert.equal(gone.payload.title, "Sync")
    assert.equal(gone.next, null)
    assert.equal(follow(shown({}), [base({ response: "declined" })]).payload.notice.kind, "declined")
    assert.equal(follow(shown({}), [base({ allDay: true })]).payload.notice.kind, "removed")
  })

  test("moved: the same meeting at another start counts down with the old values", () => {
    const r = follow(shown({}), [base({ startMs: now + 3_600_000, conference: "https://evil.example/x" })])
    assert.equal(r.payload.notice.kind, "moved")
    assert.equal(r.payload.notice.movedToMs, now + 3_600_000)
    assert.equal(r.payload.notice.closeInSeconds, 15)
    assert.equal(r.payload.startMs, now + 30_000)
    assert.equal(r.payload.url, "")
    assert.equal(r.next, null)
    assert.equal(follow(shown({}), [base({ startMs: now - 3_600_000 })]).payload.notice.kind, "moved")   // earlier, long started
  })

  test("moved and declined, moved out of the calendars", () => {
    assert.equal(follow(shown({}), [base({ startMs: now + 600_000, response: "declined" })]).payload.notice.kind, "declined")
    assert.equal(follow(shown({}), [base({ startMs: now + 600_000, calendar: "Family", calendarId: 1 })]).payload.notice.kind, "removed")
  })

  test("only recurring === false can move: a series, a missing or odd flag reads as removed", () => {
    for (const recurring of [true, undefined, "false", 0, null]) {
      const r = follow(shown({ recurring }), [base({ startMs: now + 600_000, recurring })])
      assert.equal(r.payload.notice.kind, "removed", String(recurring))
    }
  })

  test("without a valid id nothing is matched to another event", () => {
    for (const eventId of [undefined, null, "", NaN]) {
      const s = shown({ eventId })
      assert.equal(follow(s, [base({ eventId })]).action, "keep")
      assert.equal(follow(s, [base({ eventId, title: "Other" })]).payload.notice.kind, "removed")
      assert.equal(follow(s, [base({ eventId, startMs: now + 600_000 }), base({ eventId, startMs: now + 900_000 })]).payload.notice.kind, "removed")
    }
  })

  test("two candidates: the start nearest the old one", () => {
    const r = follow(shown({}), [base({ startMs: now + 7_200_000 }), base({ startMs: now + 600_000 })])
    assert.equal(r.payload.notice.movedToMs, now + 600_000)
  })

  test("a card of a recurring meeting never reads as moved, even to a candidate marked single", () => {
    assert.equal(follow(shown({ recurring: true }), [base({ startMs: now + 600_000, recurring: false })]).payload.notice.kind, "removed")
  })

  test("a candidate whose start is not a date is skipped, the valid one still wins", () => {
    for (const bad of [NaN, "x", 9e15, -1]) {
      const r = follow(shown({}), [base({ startMs: bad }), base({ startMs: now + 600_000 })])
      assert.equal(r.payload.notice.movedToMs, now + 600_000, String(bad))
    }
  })

  test("entries that are not objects are skipped", () => {
    assert.equal(follow(shown({}), [null, 3, "x", base({})]).action, "keep")
  })
})

describe("a closing card holds new alerts", () => {
  test("closingUntil: the countdown of the payload the shell accepted, else 0", () => {
    assert.equal(L.closingUntil({ notice: { kind: "removed", closeInSeconds: 15 } }, now), now + 15_000)
    assert.equal(L.closingUntil({ notice: { kind: "changed", fields: ["title"] } }, now), 0)
    assert.equal(L.closingUntil({ title: "Sync" }, now), 0)
    assert.equal(L.closingUntil({ notice: null }, now), 0)
    assert.equal(L.closingUntil({ notice: { closeInSeconds: "x" } }, now), 0)
    assert.equal(L.closingUntil(null, now), 0)
  })

  test("holdsAlerts: until the countdown ends or the card is gone; a shell that cannot tell waits for the end", () => {
    assert.equal(L.holdsAlerts(now + 15_000, true, now), true)
    assert.equal(L.holdsAlerts(now + 15_000, null, now), true)
    assert.equal(L.holdsAlerts(now + 15_000, false, now), false)    // closed early
    assert.equal(L.holdsAlerts(now + 15_000, true, now + 15_000), false)
    assert.equal(L.holdsAlerts(0, true, now), false)                 // no countdown
  })

  test("a meeting moved inside the alert window shows its note first, then alerts", () => {
    const old = ev({ title: "Sync", endMs: now + 1_800_000, recurring: false })
    const moved = { ...old, startMs: now + 40_000 }                   // leadSeconds 60: already due
    const fired = {}
    assert.equal(L.claimDue([old], now - 20_000, cfg, fired).startMs, old.startMs)
    const r = L.followShown(L.shownFor(old, cfg), true, [moved], now)
    assert.equal(r.payload.notice.kind, "moved")
    const until = L.closingUntil(r.payload, now)
    // The service skips claimDue while held, so nothing is marked and the alert comes after.
    assert.equal(L.holdsAlerts(until, true, now + 5_000), true)
    assert.equal(L.holdsAlerts(until, true, now + 15_000), false)
    assert.equal(L.claimDue([moved], now + 15_000, cfg, fired).startMs, moved.startMs)
  })
})

describe("holding alerts", () => {
  test("holdCommand: whole seconds 0 to 60, digits only", () => {
    assert.equal(L.holdCommand("30", now).untilMs, now + 30_000)
    assert.equal(L.holdCommand(" 30 ", now).message, "ok")
    assert.equal(L.holdCommand("60", now).untilMs, now + 60_000)
    assert.equal(JSON.stringify(L.holdCommand("0", now)), JSON.stringify({ untilMs: 0, message: "hold ended" }))
    for (const bad of ["61", "-1", "1.5", "abc", "", "1e1", "0x10", "+5", "0060"]) {
      assert.match(String(L.holdCommand(bad, now).error), /0 to 60/, bad)
    }
    assert.ok(L.holdCommand(undefined, now).error)
  })

  test("holdLeft: rounded up, 0 when over, 0 after the clock stepped back", () => {
    const until = now + 30_000
    assert.equal(L.holdLeft(until, now), 30)
    assert.equal(L.holdLeft(until, now + 500), 30)
    assert.equal(L.holdLeft(until, now + 29_001), 1)
    assert.equal(L.holdLeft(until, until), 0)
    assert.equal(L.holdLeft(until, until + 1), 0)
    assert.equal(L.holdLeft(until, now - 3_600_000), 0)   // stepped back an hour
    assert.equal(L.holdLeft(0, now), 0)
  })

  test("holdsAlerts: a wait further than 60 s counts as over", () => {
    assert.equal(L.holdsAlerts(now + 61_000, true, now), false)
    assert.equal(L.holdsAlerts(now + 60_000, null, now), true)
    assert.equal(L.holdsAlerts(now + 30_000, null, now + 10_000), true)
  })

  test("followShown held: a closed card is forgotten, anything else waits", () => {
    const base = ev({ title: "Sync", endMs: now + 1_800_000, conference: "https://meet.google.com/abc", recurring: false })
    const s = L.shownFor(base, cfg)
    const changed = [{ ...base, conference: "https://meet.google.com/xyz" }]
    assert.equal(L.followShown(s, true, changed, now, true).action, "keep")
    assert.equal(L.followShown(s, true, [], now, true).action, "keep")
    assert.equal(L.followShown(s, null, changed, now, true).action, "keep")
    assert.equal(L.followShown(s, false, changed, now, true).action, "forget")
    assert.equal(L.followShown(s, true, changed, now, false).action, "update")
    assert.equal(L.followShown(s, true, changed, now).action, "update")
  })

  test("a meeting due during a hold alerts after it; one whose window closed does not", () => {
    const until = L.holdCommand("60", now).untilMs
    const due = ev({ startMs: now + 30_000 })        // leadSeconds 60: due now
    const fired = {}
    // The service skips claimDue while held, so nothing is marked meanwhile.
    assert.equal(L.holdsAlerts(until, null, now + 59_000), true)
    assert.equal(L.claimDue([due], until, cfg, fired).startMs, due.startMs)
    const late = ev({ eventId: 2, startMs: now - 100_000 })   // 20 s of grace left when the hold starts
    assert.equal(L.claimDue([late], until, cfg, {}), null)
  })
})
