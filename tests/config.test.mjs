// ominous.json, the saved mode and the saved theme choice.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L } from "./helpers.mjs"

describe("config", () => {
  test("lead time and dim", () => {
    assert.equal(L.normalizeConfig(null).calendars.length, 0)
    assert.equal(L.normalizeConfig({ leadSeconds: -5 }).leadSeconds, 60)
    assert.equal(L.normalizeConfig({ leadSeconds: 300 }).leadSeconds, 300)
    assert.equal(L.normalizeConfig({}).dim, null)
    assert.equal(L.normalizeConfig({ dim: 0.8 }).dim, 0.8)
    assert.equal(L.normalizeConfig({ dim: 0 }).dim, 0)
    assert.equal(L.normalizeConfig({ dim: 2 }).dim, null)
  })

  test("tenseSeconds: default, valid, invalid", () => {
    assert.equal(L.normalizeConfig(null).tenseSeconds, 15)
    assert.equal(L.normalizeConfig({ tenseSeconds: 30 }).tenseSeconds, 30)
    assert.equal(L.normalizeConfig({ tenseSeconds: 0 }).tenseSeconds, 0)
    // null, "" and booleans must not read as 0: that would silently drop the tense phase
    for (const bad of [-3, "soon", 4000, null, "", true, [], {}, NaN])
      assert.equal(L.normalizeConfig({ tenseSeconds: bad }).tenseSeconds, 15, JSON.stringify(bad))
  })

  test("mode", () => {
    assert.equal(L.normalizeConfig(null).mode, "professional")
    assert.equal(L.normalizeConfig({ mode: "playful" }).mode, "playful")
    assert.equal(L.normalizeConfig({ mode: "PLAYFUL" }).mode, "professional")
    assert.equal(L.normalizeConfig({ mode: 3 }).mode, "professional")
  })

  test("themes: defaults, choice, and names that are not plain slugs", () => {
    assert.equal(JSON.stringify(L.normalizeConfig(null).themes), '{"professional":"classic","playful":"marine"}')
    assert.equal(L.normalizeConfig({ themes: { playful: "shiba" } }).themes.playful, "shiba")
    assert.equal(L.normalizeConfig({ themes: { playful: "shiba" } }).themes.professional, "classic")
    for (const bad of ["../x", "a/b", "", "Shiba", "x".repeat(41), 7, null, "a.json", ".."])
      assert.equal(L.normalizeConfig({ themes: { playful: bad, professional: bad } }).themes.playful, "marine", JSON.stringify(bad))
    assert.equal(L.normalizeConfig({ themes: "shiba" }).themes.playful, "marine")
    assert.equal(L.normalizeConfig({ themes: null }).themes.playful, "marine")
  })
})

describe("config file", () => {
  test("a missing file is fine, broken JSON gives defaults and an error", () => {
    assert.equal(L.parseConfig("").error, "")
    assert.equal(L.parseConfig(undefined).config.leadSeconds, 60)
    assert.equal(L.parseConfig("{ nope").error, "config parse failed, using defaults")
    assert.equal(L.parseConfig("{ nope").config.leadSeconds, 60)
    assert.equal(L.parseConfig('{"leadSeconds": 90, "mode": "playful"}').config.mode, "playful")
    assert.equal(L.parseConfig("null").config.leadSeconds, 60)
    assert.equal(L.parseConfig("[1,2]").config.calendars.length, 0)
  })
})

describe("saved mode", () => {
  const playful = L.normalizeConfig({ mode: "playful" })
  const dflt = L.normalizeConfig(null)

  test("a valid saved mode wins", () => {
    assert.equal(L.resolveMode('{"mode":"professional"}', playful), "professional")
    assert.equal(L.resolveMode({ mode: "playful" }, dflt), "playful")
  })

  test("missing, garbage or unknown falls back to the config", () => {
    assert.equal(L.resolveMode("", playful), "playful")
    assert.equal(L.resolveMode("not json{", playful), "playful")
    assert.equal(L.resolveMode('{"mode":"loud"}', playful), "playful")
    assert.equal(L.resolveMode("null", dflt), "professional")
    assert.equal(L.resolveMode(undefined, dflt), "professional")
  })
})
