// What travels from Service.qml to Alert.qml, and the preview command.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L, cfg } from "./helpers.mjs"

describe("payload between Service and Alert", () => {
  const themes = { professional: L.normalizeTheme({ progress: true }), playful: L.normalizeTheme({ phases: { angry: { caption: "grr" } } }) }
  const roundTrip = (p) => L.normalizePayload(JSON.parse(JSON.stringify(p)))

  test("an agenda event becomes a meeting payload", () => {
    const p = L.eventPayload({ title: "Sync", startMs: 5, endMs: 9, location: "R1", calendar: "work", conference: "https://meet.google.com/x" })
    assert.equal(p.title, "Sync")
    assert.equal(p.endMs, 9)
    assert.equal(p.url, "https://meet.google.com/x")
    const bare = L.eventPayload({ startMs: "7" })
    assert.equal(bare.title, "Meeting")
    assert.equal(bare.startMs, 7)
    assert.equal(bare.endMs, 0)
    assert.equal(L.eventPayload({ startMs: 1, conference: "javascript:alert(1)" }).url, "")
    assert.equal(L.eventPayload({ startMs: 1, conference: "http://insecure.example/x" }).url, "")
  })

  test("what the service sends is what the overlay reads", () => {
    const cfgP = L.normalizeConfig({ leadSeconds: 120, tenseSeconds: 20, dim: 0.5 })
    const sent = { ...L.eventPayload({ title: "Sync", startMs: 5000, endMs: 9000 }), ...L.look(cfgP, "playful", themes) }
    const got = roundTrip(sent)
    assert.equal(got.title, "Sync")
    assert.equal(got.startMs, 5000)
    assert.equal(got.leadSeconds, 120)
    assert.equal(got.tenseSeconds, 20)
    assert.equal(got.dim, 0.5)
    assert.equal(got.mode, "playful")
    assert.equal(got.themes.professional.progress, true)
    assert.equal(got.themes.playful.phases.angry.caption, "grr")
  })

  test("a bad payload gets defaults, never an error", () => {
    for (const bad of [null, undefined, "x", 3, [], {}]) {
      const p = L.normalizePayload(bad)
      assert.equal(p.title, "Meeting")
      assert.equal(p.leadSeconds, 60)
      assert.equal(p.tenseSeconds, 15)
      assert.equal(p.mode, "professional")
      assert.equal(p.dim, null)
      assert.equal(p.themes.playful.cols, 0)
    }
    const p = L.normalizePayload({ leadSeconds: -1, tenseSeconds: "soon", mode: "loud", dim: "0.5", url: "http://x.example" })
    assert.equal(p.leadSeconds, 60)
    assert.equal(p.tenseSeconds, 15)
    assert.equal(p.mode, "professional")
    assert.equal(p.dim, null)
    assert.equal(p.url, "")
  })

  test("themes in a payload are cleaned again", () => {
    const p = L.normalizePayload({ themes: { professional: "nonsense", playful: { palette: { ab: "x" }, phases: { relaxed: { frames: [["k"]], caption: "hi" } } } } })
    assert.equal(p.themes.professional.progress, false)
    assert.equal(p.themes.playful.cols, 0)                                                  // the broken sprite is dropped
    assert.equal(p.themes.playful.phases.relaxed.caption, "hi")
  })

  test("tense stays tense, relaxed stays relaxed, angry stays angry", () => {
    const at = 1_000_000
    for (const [phase, want] of [["relaxed", "relaxed"], ["tense", "tense"], ["angry", "angry"]]) {
      const r = L.previewPayload(phase, at)
      const p = roundTrip({ ...r.payload, ...L.look(cfg, "professional", themes), ...r.overrides })
      assert.equal(L.phase(p.startMs, at + 5 * 60_000, p.tenseSeconds), phase === "angry" ? "angry" : want, phase + " five minutes in")
      assert.equal(L.phase(p.startMs, at + 1000, p.tenseSeconds), want, phase + " right away")
    }
  })
})

describe("preview", () => {
  test("rejects anything but a phase first", () => {
    for (const bad of ["", "   ", "bogus", "playful angry", undefined, null])
      assert.match(L.previewPayload(bad, 0).error, /^usage: preview/, JSON.stringify(bad))
  })

  test("phase, optional mode, optional title", () => {
    const r = L.previewPayload("tense playful Weekly   sync  with the team", 1000)
    assert.equal(r.payload.title, "Weekly sync with the team")
    assert.equal(r.overrides.mode, "playful")
    assert.equal(r.overrides.tenseSeconds, 3600)
    assert.equal(r.overrides.leadSeconds, 900)
    const noMode = L.previewPayload("angry Late again", 1000)
    assert.equal(noMode.payload.title, "Late again")
    assert.equal(noMode.overrides.mode, undefined)                                          // the active mode is kept
    assert.equal(noMode.overrides.leadSeconds, undefined)
    assert.equal(L.previewPayload("relaxed", 0).payload.title, "Ominous preview meeting")
    assert.equal(L.previewPayload("relaxed professional", 0).payload.title, "Ominous preview meeting")
  })

  test("a title that starts with a mode word keeps the word after the mode", () => {
    assert.equal(L.previewPayload("relaxed playful playful hour", 0).payload.title, "playful hour")
  })

  test("every preview opens with a secure link and a future end", () => {
    for (const ph of ["relaxed", "tense", "angry"]) {
      const p = L.previewPayload(ph, 5_000_000).payload
      assert.ok(p.endMs > 5_000_000)
      assert.equal(L.safeUrl(p.url), p.url)
    }
  })
})

describe("calendar text on the card", () => {
  test("line breaks and direction overrides become spaces, white space collapses, length is capped", () => {
    assert.equal(L.cleanText("a\nb\r\nc\t d", 50), "a b c d")
    assert.equal(L.cleanText("x\u2028y\u2029z\u202ew\u2066v", 50), "x y z w v")
    assert.equal(L.cleanText("\n".repeat(500) + "end", 50), "end")
    assert.equal(L.cleanText("x".repeat(500), 80).length, 80)
    assert.equal(L.cleanText("Budget \u200f(Q3)\u200e", 50), "Budget (Q3)")
    assert.equal(L.cleanText("x\u200by\u2060z\ufeffw\u061cv", 50), "x y z w v")
    assert.equal(L.cleanText(null, 10), "")
    assert.equal(L.cleanText("\ud83d\ude00".repeat(5), 5), "\ud83d\ude00".repeat(2))
    assert.equal(L.cleanText("family \ud83d\udc68\u200d\ud83d\udc69", 50), "family \ud83d\udc68\u200d\ud83d\udc69")
  })

  test("title, place and calendar name are one bounded line in every payload", () => {
    const ev = { title: "A\nB", startMs: 5, endMs: 9, location: "Room\n".repeat(300), calendar: "c".repeat(1000), conference: "https://meet.google.com/x" }
    for (const p of [L.eventPayload(ev), L.normalizePayload(ev)]) {
      assert.equal(p.title, "A B")
      assert.ok(p.location.length <= 200 && !/\n/.test(p.location))
      assert.equal(p.calendar.length, 80)
    }
    assert.equal(L.normalizePayload({ title: "\n\n" }).title, "Meeting")
    assert.equal(L.eventPayload({ title: "   " }).title, "Meeting")
  })
})
