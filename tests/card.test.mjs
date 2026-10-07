// The card over time: phases, the bar, input rules, sprite frames.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L, now } from "./helpers.mjs"

describe("phases", () => {
  const s = now + 100_000

  test("boundaries", () => {
    assert.equal(L.phase(s, s - 16_000, 15), "relaxed")
    assert.equal(L.phase(s, s - 15_000, 15), "tense")                                       // threshold edge
    assert.equal(L.phase(s, s - 1, 15), "tense")
    assert.equal(L.phase(s, s, 15), "angry")                                                // start edge
  })

  test("late open, short lead, tense disabled, no start", () => {
    assert.equal(L.phase(s, s + 30_000, 15), "angry")                                       // late open
    assert.equal(L.phase(s, s - 5_000, 15), "tense")                                        // tense longer than lead: opens tense
    assert.equal(L.phase(s, s - 1, 0), "relaxed")                                           // tense disabled
    assert.equal(L.phase(s, s, 0), "angry")
    assert.equal(L.phase(0, now, 15), "relaxed")
  })

  test("progress fill", () => {
    const e = s + 30 * 60_000
    assert.equal(L.progress(s, e, s - 60_000, 60), 0)                                       // window just opened
    assert.equal(L.progress(s, e, s - 15_000, 60), 0.75)
    assert.equal(L.progress(s, e, s - 90_000, 60), 0)                                       // before the window: clamped
    assert.equal(L.progress(s, e, s - 5_000, 0), 1)                                         // no lead
    assert.equal(L.progress(s, e, s + 6 * 60_000, 60), 0.2)                                 // 6 of 30 minutes
    assert.equal(L.progress(s, 0, s + 6 * 60_000, 60), 1)                                   // no end
    assert.equal(L.progress(s, e, e + 60_000, 60), 1)                                       // past the end: clamped
    assert.equal(L.progress(s, e, NaN, 60), 0)
  })
})

describe("the card's input rules", () => {
  test("input is swallowed for the first second only", () => {
    assert.equal(L.isGuarded(now, 0, now, 1000), true)
    assert.equal(L.isGuarded(now, 0, now + 999, 1000), true)
    assert.equal(L.isGuarded(now, 0, now + 1000, 1000), false)
  })

  test("a key pressed while guarded keeps the card guarded until a one-second pause", () => {
    // Typing a space every 300 ms from the moment the card opens: still guarded at 2.1 s.
    assert.equal(L.isGuarded(now, now + 1800, now + 2100, 1000), true)
    assert.equal(L.isGuarded(now, now + 1800, now + 2799, 1000), true)
    assert.equal(L.isGuarded(now, now + 1800, now + 2800, 1000), false)
    assert.equal(L.isGuarded(now, now - 5000, now + 1000, 1000), false)   // an older key than the card does not count
  })

  test("the card closes when the meeting ends, never for one without an end", () => {
    assert.equal(L.isOver(now + 5000, now), false)
    assert.equal(L.isOver(now, now), true)
    assert.equal(L.isOver(now - 1, now), true)
    assert.equal(L.isOver(0, now), false)
  })

  test("Join is the default only for a recognized link", () => {
    assert.equal(L.initialSelection("https://meet.google.com/x", true), 0)
    assert.equal(L.initialSelection("https://evil.example/x", false), 1)
    assert.equal(L.initialSelection("", false), 1)
    assert.equal(L.initialSelection("", true), 1)
  })

  test("arrows and Tab flip the buttons, but there is nothing to flip without a link", () => {
    assert.equal(L.nextSelection(0, "https://meet.google.com/x"), 1)
    assert.equal(L.nextSelection(1, "https://meet.google.com/x"), 0)
    assert.equal(L.nextSelection(1, ""), 1)
    assert.equal(L.nextSelection(0, ""), 0)
  })

  test("Enter never joins without a link", () => {
    assert.equal(L.activation(0, "https://meet.google.com/x"), "join")
    assert.equal(L.activation(1, "https://meet.google.com/x"), "dismiss")
    assert.equal(L.activation(0, ""), "dismiss")
    assert.equal(L.activation(1, ""), "dismiss")
  })
})

describe("sprite frames", () => {
  test("frameAt wraps and tolerates nothing to show", () => {
    const f = ["a", "b", "c"]
    assert.equal(L.frameAt(f, 0), "a")
    assert.equal(L.frameAt(f, 2), "c")
    assert.equal(L.frameAt(f, 3), "a")
    assert.equal(L.frameAt(f, 7), "b")
    assert.equal(L.frameAt(f, -1), "c")
    assert.equal(L.frameAt([], 3), null)
    assert.equal(L.frameAt(null, 0), null)
    assert.equal(L.frameAt(undefined, 0), null)
  })
})
