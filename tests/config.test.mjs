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

describe("config file: comments and trailing commas", () => {
  const strip = (t) => L.stripJsonc(t)
  const read = (t) => L.parseConfig(t).config

  test("a plain file reads exactly as before", () => {
    const plain = '{"calendars": ["Work@Example.com"], "leadSeconds": 90, "themes": {"playful": "shiba"}}'
    assert.equal(strip(plain), plain)
    assert.deepEqual(JSON.parse(JSON.stringify(read(plain))), JSON.parse(JSON.stringify(L.normalizeConfig(JSON.parse(plain)))))
  })

  test("a commented-out option keeps its default", () => {
    const c = read('{\n  "leadSeconds": 120,\n  // "dim": 0.5\n}')
    assert.equal(c.leadSeconds, 120)
    assert.equal(c.dim, null)
  })

  test("a comment after a value, and a comment on the last line without a newline", () => {
    assert.equal(read('{"leadSeconds": 30 // half a minute\n}').leadSeconds, 30)
    assert.equal(read('{"leadSeconds": 30}\n// the end').leadSeconds, 30)
  })

  test("// inside a string is part of the string", () => {
    assert.equal(strip('{"a": "https://example.com/a//b"}'), '{"a": "https://example.com/a//b"}')
    assert.equal(JSON.parse(strip('{"a": "x // y", // note\n"b": 1}')).a, "x // y")
  })

  test("an escaped quote does not end the string", () => {
    const t = '{"a": "say \\"hi\\" // not a comment", // real comment\n"b": 1}'
    assert.equal(JSON.parse(strip(t)).a, 'say "hi" // not a comment')
    assert.equal(JSON.parse(strip(t)).b, 1)
  })

  test("trailing commas, also nested and before a comment", () => {
    assert.deepEqual(JSON.parse(strip('{"a": [1, 2,], "b": {"c": 1,},}')), { a: [1, 2], b: { c: 1 } })
    assert.deepEqual(JSON.parse(strip('{"a": [1,\n // "x",\n],\n}')), { a: [1] })
    assert.equal(read('{"calendars": ["work",],}').calendars[0], "work")
  })

  test("a comma inside a string before a bracket is kept", () => {
    assert.equal(JSON.parse(strip('{"a": "x,]"}')).a, "x,]")
  })

  test("a leading byte order mark is ignored", () => {
    assert.equal(read("\uFEFF" + '{"leadSeconds": 45}').leadSeconds, 45)
    assert.equal(L.parseConfig("\uFEFF" + '{"leadSeconds": 45}').error, "")
  })

  test("a file still broken after stripping gives defaults and an error", () => {
    const r = L.parseConfig('{"leadSeconds": 45, // comment\n "dim": }')
    assert.equal(r.error, "config parse failed, using defaults")
    assert.equal(r.config.leadSeconds, 60)
  })
})

describe("config file: unknown keys", () => {
  test("a misspelt key is listed, sorted, and ignored", () => {
    const r = L.parseConfig('{"leadsecond": 30, "calendar": [], "leadSeconds": 90}')
    assert.deepEqual([...r.unknownKeys], ["calendar", "leadsecond"])
    assert.equal(r.config.leadSeconds, 90)
  })

  test("$schema is not reported", () => {
    assert.deepEqual([...L.parseConfig('{"$schema": "https://example.com/s.json", "mode": "playful"}').unknownKeys], [])
  })

  test("a clean, empty, broken or non-object file has none", () => {
    assert.deepEqual([...L.parseConfig('{"mode": "playful"}').unknownKeys], [])
    assert.deepEqual([...L.parseConfig("").unknownKeys], [])
    assert.deepEqual([...L.parseConfig("{ nope").unknownKeys], [])
    assert.deepEqual([...L.parseConfig("[1,2]").unknownKeys], [])
  })

  test("keys inside themes are not reported", () => {
    assert.deepEqual([...L.parseConfig('{"themes": {"playful": "shiba", "other": "x"}}').unknownKeys], [])
  })
})

describe("the config declaration", () => {
  const plain = (v) => JSON.parse(JSON.stringify(v))

  test("DEFAULTS come from CONFIG_FIELDS, one entry per key, none missing", () => {
    const keys = [...L.CONFIG_FIELDS].map((f) => f.key)
    assert.equal(new Set(keys).size, keys.length)
    assert.deepEqual([...keys].sort(), Object.keys(L.DEFAULTS).sort())
    for (const f of L.CONFIG_FIELDS) assert.deepEqual(plain(L.DEFAULTS[f.key]), plain(f.default))
  })

  test("every field has a one-line description and a schema with a type or an enum", () => {
    for (const f of L.CONFIG_FIELDS) {
      assert.match(f.description, /^[^\n]{10,160}$/, f.key + " description")
      assert.ok(f.schema.type || f.schema.enum, f.key + " schema")
    }
  })

  test("normalizeConfig accepts every default unchanged", () => {
    const raw = {}
    for (const f of L.CONFIG_FIELDS) raw[f.key] = plain(f.default)
    assert.deepEqual(plain(L.normalizeConfig(raw)), plain(L.normalizeConfig(null)))
    assert.deepEqual(plain(L.normalizeConfig(null)), plain(L.DEFAULTS))
  })
})

describe("the printed config", () => {
  const plain = (v) => JSON.parse(JSON.stringify(v))
  const keysIn = (text) => [...text.matchAll(/^  "([^"]+)":/gm)].map((m) => m[1])

  test("lists every key in order, each under its description, after $schema", () => {
    const out = L.formatConfig(L.normalizeConfig(null), [])
    assert.deepEqual(keysIn(out), ["$schema", ...[...L.CONFIG_FIELDS].map((f) => f.key)])
    for (const f of L.CONFIG_FIELDS) assert.ok(out.includes("  // " + f.description + "\n  \"" + f.key + "\":"), f.key)
  })

  test("holds the user's values and the defaults elsewhere", () => {
    const out = L.formatConfig(L.normalizeConfig({ leadSeconds: 90, calendars: ["Work@Example.com"] }), [])
    assert.match(out, /"leadSeconds": 90,/)
    assert.match(out, /"calendars": \["work@example.com"\],/)
    assert.match(out, /"tenseSeconds": 15,/)
    assert.match(out, /"dim": null,/)
  })

  test("reads back to the same config, comments and all", () => {
    for (const raw of [null, { leadSeconds: 90, dim: 0.5, mode: "playful", onlyWithLink: true,
                              calendars: ["a", "b"], themes: { playful: "shiba" } }]) {
      const cfg = L.normalizeConfig(raw)
      const r = L.parseConfig(L.formatConfig(cfg, []))
      assert.equal(r.error, "")
      assert.deepEqual([...r.unknownKeys], [])
      assert.deepEqual(plain(r.config), plain(cfg))
    }
  })

  test("names unknown keys in the header, only when there are some", () => {
    assert.doesNotMatch(L.formatConfig(L.normalizeConfig(null), []), /nknown/)
    const out = L.formatConfig(L.normalizeConfig(null), ["joinhost", "leadsecond"])
    assert.match(out.split("\n{")[0], /^\/\/ .*nknown keys.*: joinhost, leadsecond$/m)
  })

  test("says that the card's saved mode and theme are kept apart", () => {
    assert.match(L.formatConfig(L.normalizeConfig(null), []).split("\n{")[0], /state/)
  })

  test("is valid with no trailing comma after the last key", () => {
    const out = L.formatConfig(L.normalizeConfig(null), [])
    assert.doesNotMatch(out, /,\s*\n}\s*$/)
  })
})

describe("the config schema", () => {
  const plain = (v) => JSON.parse(JSON.stringify(v))
  const schema = plain(L.configSchema())

  // The few constraints the schema uses, checked by hand: no validator without a dependency.
  const satisfies = (v, sc) => {
    if (sc.enum) return sc.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))
    const types = [].concat(sc.type)
    const t = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v
    if (!types.some((x) => x === t || (x === "number" && t === "integer"))) return false
    if (typeof v === "number") return (sc.minimum === undefined || v >= sc.minimum) && (sc.maximum === undefined || v <= sc.maximum)
    if (t === "array") return v.every((e) => !sc.items || satisfies(e, sc.items))
    if (t === "object")
      return Object.keys(v).every((k) => sc.properties && sc.properties[k] && satisfies(v[k], sc.properties[k]))
    if (typeof v === "string" && sc.pattern) return new RegExp(sc.pattern).test(v)
    return true
  }

  test("is a JSON Schema object that allows unknown keys and $schema", () => {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema")
    assert.equal(schema.type, "object")
    assert.equal(schema.additionalProperties, true)
    assert.equal(schema.properties.$schema.type, "string")
  })

  test("has one property per field, with its default and description", () => {
    assert.deepEqual(Object.keys(schema.properties).filter((k) => k !== "$schema"), [...L.CONFIG_FIELDS].map((f) => f.key))
    for (const f of L.CONFIG_FIELDS) {
      assert.deepEqual(schema.properties[f.key].default, plain(f.default), f.key)
      assert.equal(schema.properties[f.key].description, f.description, f.key)
    }
  })

  test("every default satisfies its own constraints", () => {
    for (const f of L.CONFIG_FIELDS) assert.ok(satisfies(plain(f.default), schema.properties[f.key]), f.key)
  })

  test("a value that normalizeConfig would reject does not satisfy the schema", () => {
    const p = schema.properties
    assert.ok(!satisfies("x", p.leadSeconds))
    assert.ok(!satisfies(4000, p.leadSeconds))
    assert.ok(!satisfies(-1, p.tenseSeconds))
    assert.ok(!satisfies(2, p.dim))
    assert.ok(satisfies(null, p.dim))
    assert.ok(!satisfies("loud", p.mode))
    assert.ok(!satisfies({ playful: "Bad Name" }, p.themes))
    assert.ok(!satisfies({ other: "x" }, p.themes))
    assert.ok(!satisfies("yes", p.onlyWithLink))
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
