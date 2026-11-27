// Theme files, choosing one, the theme commands and the shipped themes.
import { readFileSync, readdirSync } from "node:fs"
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L } from "./helpers.mjs"

describe("theme files", () => {
  const sprite = {
    progress: true,
    palette: { k: "background", o: "#c88a5a", ".": "transparent" },
    phases: {
      relaxed: { color: "accent", caption: "All clear.", frames: [["kk", "oo"]] },
      tense: { color: " #ffcc00 ", caption: "  Incoming.\n", frameMs: 900, frames: [["kk", "oo"], ["ok", "ko"]] },
      angry: { color: "urgent", caption: "x".repeat(200), frameMs: 10, shake: true, frames: [["kk", "oo"]] }
    }
  }
  const broken = (mutate) => { const c = JSON.parse(JSON.stringify(sprite)); mutate(c); return L.normalizeTheme(c) }

  test("a full theme is cleaned", () => {
    const t = L.normalizeTheme(sprite)
    assert.equal(t.progress, true)
    assert.equal(t.cols, 2)
    assert.equal(t.rows, 2)
    assert.equal(t.palette.o, "#c88a5a")
    assert.equal(t.phases.tense.frames.length, 2)
    assert.equal(t.phases.tense.color, "#ffcc00")
    assert.equal(t.phases.tense.caption, "Incoming.")
    assert.equal(t.phases.tense.frameMs, 900)
    assert.equal(t.phases.relaxed.frameMs, 500)                                             // default
    assert.equal(t.phases.angry.frameMs, 80)                                                // clamped up
    assert.equal(t.phases.angry.caption.length, 80)
    assert.equal(t.phases.angry.shake, true)
    assert.equal(t.phases.relaxed.shake, false)
    assert.equal(L.normalizeTheme({ phases: { tense: { frameMs: 99999 } } }).phases.tense.frameMs, 5000)
    assert.equal(L.normalizeTheme({ phases: { tense: { frameMs: null } } }).phases.tense.frameMs, 500)
  })

  test("a caption is one clean line, like calendar text", () => {
    const t = L.normalizeTheme({ phases: { angry: { caption: "a\u202eb\nc" + "\u0301".repeat(60) } } })
    assert.equal(t.phases.angry.caption.startsWith("a b c"), true)
    assert.doesNotMatch(t.phases.angry.caption, /[\u202e\n]/)
    assert.equal(L.normalizeTheme({ phases: { angry: { caption: 0 } } }).phases.angry.caption, "0")
  })

  test("more than 64 frames in a phase: no sprite, the rest still applies", () => {
    const frames = (n) => Array.from({ length: n }, () => ["kk", "oo"])
    const ok = L.normalizeTheme({ palette: { k: "#000000", o: "#ffffff" }, phases: { tense: { frames: frames(64) } } })
    assert.equal(ok.phases.tense.frames.length, 64)
    const big = L.normalizeTheme({ palette: { k: "#000000", o: "#ffffff" }, phases: { tense: { color: "urgent", caption: "Hi", frames: frames(20000) } } })
    assert.equal(big.cols, 0)
    assert.equal(big.phases.tense.frames.length, 0)
    assert.equal(big.phases.tense.caption, "Hi")
  })

  test("colors only, no sprite", () => {
    const plain = L.normalizeTheme({ progress: true, phases: { angry: { color: "urgent" } } })
    assert.equal(plain.cols, 0)
    assert.equal(plain.phases.angry.frames.length, 0)
    assert.equal(plain.phases.relaxed.color, "")
    assert.equal(plain.phases.relaxed.caption, "")
    assert.equal(L.normalizeTheme({}).progress, false)
  })

  test("input that is not an object is rejected", () => {
    for (const bad of [null, undefined, "x", 3, [], true]) assert.equal(L.normalizeTheme(bad), null)
  })

  describe("a malformed sprite is dropped, colors and captions survive", () => {
    for (const [label, mutate] of [
      ["frame sizes differ", (c) => { c.phases.tense.frames[1] = ["kkk", "ooo"] }],
      ["frame heights differ", (c) => { c.phases.tense.frames[1] = ["kk"] }],
      ["row lengths differ", (c) => { c.phases.relaxed.frames[0] = ["kk", "o"] }],
      ["too wide", (c) => { for (const p of ["relaxed", "tense", "angry"]) c.phases[p].frames = [["k".repeat(41)]] }],
      ["too tall", (c) => { for (const p of ["relaxed", "tense", "angry"]) c.phases[p].frames = [Array(41).fill("kk")] }],
      ["long palette key", (c) => { c.palette.ab = "accent" }],
      ["empty palette key", (c) => { c.palette[""] = "accent" }],
      ["frames not an array", (c) => { c.phases.relaxed.frames = "kk" }],
      ["row not a string", (c) => { c.phases.relaxed.frames = [[1, 2]] }],
      ["no palette", (c) => { delete c.palette }],
    ]) {
      test(label, () => {
        const b = broken(mutate)
        assert.equal(b.cols, 0)
        assert.equal(b.phases.tense.frames.length, 0)
        assert.equal(b.progress, true)
        assert.equal(b.phases.relaxed.caption, "All clear.")
        assert.equal(b.phases.angry.color, "urgent")
      })
    }
  })

  test("an empty frame list leaves only that phase without a sprite, also after the payload", () => {
    const t = broken((c) => { c.phases.relaxed.frames = [] })
    assert.equal(t.cols, 2)
    assert.equal(t.phases.relaxed.frames.length, 0)
    assert.equal(t.phases.tense.frames.length, 2)
    const again = L.normalizeTheme(JSON.parse(JSON.stringify(t)))
    assert.equal(again.cols, 2)
    assert.equal(again.phases.relaxed.frames.length, 0)
    assert.equal(again.phases.tense.frames.length, 2)
  })

  test("odd palette values and partial sprites", () => {
    assert.equal(broken((c) => { c.palette.o = 7 }).cols, 2)                                // not a string: ignored, sprite stays
    assert.equal(broken((c) => { c.palette.o = 7 }).palette.o, undefined)
    const part = broken((c) => { delete c.phases.relaxed.frames })                          // a phase may have no sprite
    assert.equal(part.cols, 2)
    assert.equal(part.phases.relaxed.frames.length, 0)
  })
})

describe("sprite size, intro and loop", () => {
  const square = (n) => Array(n).fill("k".repeat(n))
  const withFrames = (angry, extra = {}) => L.normalizeTheme({
    palette: { k: "#000000" },
    phases: { relaxed: { frames: [angry[0]] }, angry: { shake: true, frames: angry, ...extra } }
  })

  test("40x40 is the largest sprite", () => {
    assert.equal(L.normalizeTheme({ palette: { k: "#000000" }, phases: { relaxed: { frames: [square(40)] } } }).cols, 40)
    assert.equal(L.normalizeTheme({ palette: { k: "#000000" }, phases: { relaxed: { frames: [square(41)] } } }).cols, 0)
  })

  test("loopFrom is kept only as a whole index below the frame count", () => {
    const three = [["k"], ["k"], ["k"]]
    assert.equal(withFrames(three, { loopFrom: 2 }).phases.angry.loopFrom, 2)
    for (const bad of [3, -1, 1.5, "2", null, true]) assert.equal(withFrames(three, { loopFrom: bad }).phases.angry.loopFrom, 0)
    assert.equal(withFrames(three).phases.angry.loopFrom, 0)
    assert.equal(withFrames(three).phases.tense.loopFrom, 0)                                // no frames at all
  })

  test("loopFrom survives a second normalization, as in the payload", () => {
    const t = L.normalizeTheme({ palette: { k: "#000000" }, phases: { relaxed: { frames: [["k"]] }, tense: { frames: [["k"]] },
                                                                     angry: { frames: [["k"], ["k"], ["k"]], loopFrom: 1 } } })
    assert.equal(L.normalizeTheme(JSON.parse(JSON.stringify(t))).phases.angry.loopFrom, 1)
  })

  test("an intro plays once, then the loop repeats", () => {
    const seen = [0]
    for (let i = 0; i < 10; i++) seen.push(L.nextFrame(seen[seen.length - 1], 7, 4))
    assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 4, 5, 6, 4])
    assert.deepEqual([0, 1, 2].map((i) => L.nextFrame(i, 3, 0)), [1, 2, 0])            // no intro: all loop
    assert.equal(L.nextFrame(0, 1, 0), 0)
    assert.equal(L.nextFrame(0, 0, 0), 0)
  })

  test("the jolt comes on entry without an intro, at the loop start with one", () => {
    const plain = withFrames([["k"], ["k"]]).phases.angry
    const intro = withFrames([["k"], ["k"], ["k"], ["k"]], { loopFrom: 2 }).phases.angry
    assert.equal(L.joltOnEnter("angry", plain), true)
    assert.equal(L.joltOnEnter("angry", intro), false)
    assert.equal(L.joltOnEnter("tense", plain), false)
    assert.equal(L.joltOnEnter("angry", { ...plain, shake: false }), false)
    assert.equal(L.joltOnStep("angry", intro, 1, 2), true)
    assert.equal(L.joltOnStep("angry", intro, 3, 2), false)                                 // the loop coming back
    assert.equal(L.joltOnStep("angry", intro, 0, 1), false)
    assert.equal(L.joltOnStep("angry", plain, 1, 0), false)
    assert.equal(L.joltOnStep("tense", intro, 1, 2), false)
    const lastOnly = withFrames([["k"], ["k"], ["k"]], { loopFrom: 2 }).phases.angry       // a one-frame loop
    assert.equal(L.joltOnStep("angry", lastOnly, 1, 2), true)
    assert.equal(L.joltOnStep("angry", lastOnly, 2, 2), false)
  })

  test("sameArt tells a real change of art from a fresh copy", () => {
    const raw = { palette: { k: "#000000", o: "#ffffff" }, phases: { angry: { frames: [["ko"], ["ok"]], loopFrom: 1 } } }
    const a = L.normalizeTheme(raw)
    assert.equal(L.sameArt(a, L.normalizeTheme(JSON.parse(JSON.stringify(raw)))), true)
    assert.equal(L.sameArt(a, L.normalizeTheme({ ...raw, palette: { k: "#000000", o: "#eeeeee" } })), false)
    assert.equal(L.sameArt(a, L.normalizeTheme({ ...raw, phases: { angry: { frames: [["ko"], ["kk"]], loopFrom: 1 } } })), false)
    assert.equal(L.sameArt(a, L.normalizeTheme({ ...raw, phases: { angry: { frames: [["ko"], ["ok"]] } } })), false)
    assert.equal(L.sameArt(null, a), false)
    assert.equal(L.sameArt(a, { ...a, caption: "x" }), true)                              // captions and colors are not art
  })

  test("the sprite is centred on the text band, never above the column", () => {
    assert.equal(L.spriteTop(40, 240, 100, 0), 90)
    assert.equal(L.spriteTop(40, 241, 100, 0), 91)                                          // whole pixels
    assert.equal(L.spriteTop(40, 140, 200, 0), 0)                                           // taller: clamped to the column
    assert.equal(L.spriteTop(40, 140, 200, 10), 10)
  })
})

describe("theme choice", () => {
  const th = (id) => ({ status: "ok", theme: { id } })
  const st = (status) => ({ status, theme: null })

  test("user file, then the plugin's, then the mode's default", () => {
    assert.equal(L.pickTheme("x", th("user"), th("shipped"), th("def")).theme.id, "user")
    assert.equal(L.pickTheme("x", st("missing"), th("shipped"), th("def")).theme.id, "shipped")
    assert.equal(L.pickTheme("x", st("missing"), th("shipped"), th("def")).error, "")
    assert.equal(L.pickTheme("x", th("user"), st("invalid"), st("invalid")).error, "")      // a user file needs nothing else
  })

  test("unknown name and broken user file fall back with an error", () => {
    assert.equal(L.pickTheme("x", st("missing"), st("missing"), th("def")).theme.id, "def")
    assert.match(L.pickTheme("x", st("missing"), st("missing"), th("def")).error, /not found/)
    assert.equal(L.pickTheme("x", st("invalid"), th("shipped"), th("def")).theme.id, "def")
    assert.match(L.pickTheme("x", st("invalid"), th("shipped"), th("def")).error, /not valid/)
  })

  test("loading is pending, and nothing at all gives plain defaults", () => {
    assert.equal(L.pickTheme("x", st("loading"), st("loading"), st("loading")).pending, true)
    assert.equal(L.pickTheme("x", st("missing"), st("loading"), th("def")).pending, true)
    assert.equal(L.pickTheme("x", st("missing"), st("missing"), st("loading")).pending, true)
    const last = L.pickTheme("x", st("missing"), st("missing"), st("missing"))
    assert.equal(last.pending, false)
    assert.equal(last.theme.progress, false)
    assert.match(last.error, /default theme unavailable/)
  })
})

describe("theme commands", () => {
  const shippedFiles = ["boss.json", "classic.json", "marine.json", "shiba.json"]
  const cfgD = L.normalizeConfig(null)
  const names = (cat) => [...cat].map((t) => t.name)   // copied out of the vm realm for deepEqual

  test("catalog: shipped and user themes, a user file overrides, odd files are skipped", () => {
    const cat = L.themeCatalog(["mine.json", "shiba.json", "Bad Name.json", "notes.txt", "../x.json"], shippedFiles)
    assert.deepEqual(names(cat), ["boss", "classic", "marine", "mine", "shiba"])
    assert.equal(cat.find((t) => t.name === "mine").source, "user")
    assert.equal(cat.find((t) => t.name === "shiba").source, "user (overrides shipped)")
    assert.equal(cat.find((t) => t.name === "classic").source, "shipped")
    assert.equal(L.themeCatalog(undefined, undefined).length, 0)
  })

  test("list: each theme, its source, and the mode that uses it", () => {
    const out = L.formatThemeList(L.themeCatalog([], shippedFiles), L.resolveThemes("", cfgD))
    const lines = out.split("\n")
    assert.equal(lines.length, 4)
    assert.match(lines[0], /^boss\s+shipped$/)
    assert.match(lines[1], /^classic\s+shipped\s+<- professional$/)
    assert.match(lines[2], /^marine\s+shipped\s+<- playful$/)
    assert.match(lines[3], /^shiba\s+shipped$/)
  })

  test("list: one theme for both modes, and a theme the config names but nobody shipped", () => {
    const both = L.formatThemeList(L.themeCatalog([], shippedFiles), { professional: "shiba", playful: "shiba" })
    assert.match(both, /^shiba\s+shipped\s+<- professional, playful$/m)
    const missing = L.formatThemeList(L.themeCatalog([], shippedFiles), { professional: "classic", playful: "gone" })
    assert.match(missing, /^gone\s+missing: falls back to marine\s+<- playful$/m)
  })

  test("saved choice: valid names per mode only", () => {
    assert.deepEqual({ ...L.parseThemeOverrides('{"playful":"shiba"}') }, { playful: "shiba" })
    assert.deepEqual({ ...L.parseThemeOverrides('{"playful":"../x","professional":7,"other":"a"}') }, {})
    for (const bad of ["", "garbage", "null", "[1]", undefined]) assert.deepEqual({ ...L.parseThemeOverrides(bad) }, {})
  })

  test("the saved choice wins over ominous.json, per mode", () => {
    const cfgS = L.normalizeConfig({ themes: { playful: "marine", professional: "classic" } })
    const r = L.resolveThemes('{"playful":"shiba"}', cfgS)
    assert.equal(r.playful, "shiba")
    assert.equal(r.professional, "classic")
    assert.equal(L.resolveThemes("", cfgS).playful, "marine")
    assert.equal(L.resolveThemes("{broken", cfgD).playful, "marine")
  })

  const avail = ["boss", "classic", "marine", "shiba"]

  test("theme <name>: playful by default, says how to see it", () => {
    const r = L.themeCommand("shiba", {}, avail, "professional")
    assert.equal(r.error, undefined)
    assert.deepEqual({ ...r.overrides }, { playful: "shiba" })
    assert.match(r.message, /^playful theme: shiba \(the card is in professional mode/)
    assert.equal(L.themeCommand("shiba", {}, avail, "playful").message, "playful theme: shiba")
  })

  test("theme <name> <mode>: only that mode changes", () => {
    const r = L.themeCommand("marine professional", { playful: "shiba" }, avail, "professional")
    assert.deepEqual({ ...r.overrides }, { playful: "shiba", professional: "marine" })
    assert.equal(r.message, "professional theme: marine")
  })

  test("unknown or invalid names are refused, with the list", () => {
    for (const bad of ["poodle", "../classic", "Shiba", "classic.json"]) {
      const r = L.themeCommand(bad, { playful: "shiba" }, avail, "playful")
      assert.match(r.error, /^no theme ".*"; available: boss, classic, marine, shiba$/, bad)
      assert.equal(r.overrides, undefined)
    }
  })

  test("bad usage", () => {
    for (const bad of ["", "  ", "shiba loud", "shiba playful extra", undefined])
      assert.match(L.themeCommand(bad, {}, avail, "playful").error, /^usage: theme/, String(bad))
  })

  test("reset: one mode or both", () => {
    const saved = { playful: "shiba", professional: "marine" }
    assert.deepEqual({ ...L.themeCommand("reset playful", saved, avail, "playful").overrides }, { professional: "marine" })
    assert.deepEqual({ ...L.themeCommand("reset", saved, avail, "playful").overrides }, {})
    assert.equal(L.themeCommand("reset", saved, avail, "playful").message, "themes back to ominous.json")
    assert.equal(saved.playful, "shiba", "the caller's object is not modified")
  })

  test("garbage in the saved choice is dropped on the next command", () => {
    assert.deepEqual({ ...L.themeCommand("shiba", { professional: "../x" }, avail, "playful").overrides }, { playful: "shiba" })
  })
})

// The flash limit (spec "Shipped themes flash at most twice a second"): stand-in cards, with
// stand-ins for the theme roles on each.
const CARDS = {
  light: { background: [0xee, 0xf0, 0xf6], foreground: [0x2a, 0x2b, 0x3a], accent: [0x3c, 0x6e, 0xdc], urgent: [0xd2, 0x32, 0x32], muted: [0x8c, 0x8c, 0x96] },
  dark: { background: [0x0a, 0x0c, 0x22], foreground: [0xe6, 0xe4, 0xf4], accent: [0x78, 0xa0, 0xff], urgent: [0xf0, 0x50, 0x50], muted: [0x6e, 0x6e, 0x82] },
}

/** A palette token as [r, g, b, alpha 0..1] on a stand-in card; null for transparent or unknown. */
function tokenRgba(token, card) {
  const t = token.trim().toLowerCase()
  if (t === "transparent") return null
  if (card[t]) return [...card[t], 1]
  let m = t.match(/^#([0-9a-f]{3})$/)
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1)
  m = t.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/)
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(m[2] ? parseInt(m[2], 16) / 255 : 1) : null
}

/** The color a cell shows on a card, [r, g, b]: its token blended over the card's background. */
function cellRgb(token, card) {
  const c = token === undefined ? null : tokenRgba(token, card), a = c ? c[3] : 0
  return [0, 1, 2].map((i) => card.background[i] * (1 - a) + (c ? c[i] * a : 0))
}

/** WCAG relative luminance of an [r, g, b] color. */
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The mean luminance of the cells of a frame inside [x0, x1) x [y0, y1), drawn on a card. */
function areaLuminance(frame, palette, card, [x0, y0, x1, y1]) {
  let sum = 0, cells = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) (sum += luminance(cellRgb(palette[frame[y][x]], card))), cells++
  return sum / cells
}

/**
 * Flashes in the worst window of `span` steps of a luminance sequence: a flash is a pair of
 * opposing changes of at least 0.1, the darker side below 0.8; changes in the same direction
 * merge into one (WCAG 2.3.1, general flash).
 */
function countFlashes(seq, span) {
  let worst = 0
  for (let a = 0; a + span < seq.length; a++) {
    const dirs = []
    let ref = seq[a]
    for (let k = a + 1; k <= a + span; k++) {
      const d = seq[k] - ref, s = Math.sign(d)
      if (dirs.length && s === dirs[dirs.length - 1]) { ref = seq[k]; continue }
      if (Math.abs(d) >= 0.1 && Math.min(seq[k], ref) < 0.8) { dirs.push(s); ref = seq[k] }
    }
    worst = Math.max(worst, Math.floor(dirs.length / 2))
  }
  return worst
}

/**
 * The most flashes in any one-second window of a normalized phase played as on the card (the
 * intro once, then the loop repeated until every window that starts in the intro or the first
 * loop is whole; windows of floor(1000 / frameMs) steps), over the whole sprite and over each of
 * its halves (top, bottom, left, right): a flash on half the 200-pixel sprite is about WCAG's
 * smallest counted area, and a whole-sprite mean alone could dilute it.
 */
function worstFlashes(phase, palette, card) {
  const w = phase.frames[0][0].length, h = phase.frames[0].length
  const areas = [[0, 0, w, h], [0, 0, w, h >> 1], [0, h >> 1, w, h], [0, 0, w >> 1, h], [w >> 1, 0, w, h]]
  const span = Math.floor(1000 / phase.frameMs)
  return Math.max(...areas.map((area) => {
    const lum = phase.frames.map((f) => areaLuminance(f, palette, card, area)), loop = lum.slice(phase.loopFrom || 0), seq = lum.slice()
    while (seq.length <= lum.length + loop.length + span) seq.push(...loop)
    return countFlashes(seq, span)
  }))
}

/**
 * Whether a theme file carries a third-party name: in its file name or captions only, never its
 * frames, whose rows are runs of palette letters and can spell a word by chance.
 */
function namesThirdParty(file, raw) {
  const captions = Object.values(raw.phases || {}).map((p) => (p && typeof p.caption === "string" ? p.caption : ""))
  return /doom|id software|doge|dogecoin|kabosu/i.test([file, ...captions].join("\n"))
}

describe("flash counter and name guard", () => {
  test("black and white frames alternating at 120 ms flash more than twice a second", () => {
    const blink = { frames: [["k"], ["w"]], frameMs: 120, loopFrom: 0 }
    for (const card of Object.values(CARDS)) assert.ok(worstFlashes(blink, { k: "#000000", w: "#ffffff" }, card) > 2)
  })

  test("the cutoffs: a change of 0.15 counts, 0.099 does not, nor one whose darker side is at 0.8", () => {
    assert.equal(countFlashes([0.5, 0.65, 0.5, 0.65, 0.5], 4), 2)
    assert.equal(countFlashes([0.5, 0.599, 0.5, 0.599, 0.5], 4), 0)
    assert.equal(countFlashes([0.8, 0.95, 0.8, 0.95, 0.8], 4), 0)
    assert.equal(countFlashes([0.79, 0.95, 0.79], 2), 1)
  })

  test("a flash on half the sprite counts even when the whole sprite's mean hides it", () => {
    const top = "w".repeat(4), dark = "k".repeat(4), half = [top, top, dark, dark], none = [dark, dark, dark, dark]
    const phase = { frames: [half, none], frameMs: 120, loopFrom: 0 }, pal = { k: "#000000", w: "#6a6a6a" }
    assert.ok(countFlashes([0, 1, 0, 1, 0, 1, 0, 1, 0].map((k) => areaLuminance(phase.frames[k], pal, CARDS.dark, [0, 0, 4, 4])), 8) <= 2)
    assert.ok(worstFlashes(phase, pal, CARDS.dark) > 2)
  })

  test("a half-transparent cell blends over the card, on a light and a dark card", () => {
    for (const card of Object.values(CARDS)) {
      const got = cellRgb("#00000080", card)
      card.background.forEach((c, i) => assert.ok(Math.abs(got[i] - c * (1 - 128 / 255)) <= 1, `channel ${i} on ${c}`))
    }
  })

  test("the guard reads names and captions, not frames", () => {
    assert.equal(namesThirdParty("x.json", { phases: { relaxed: { caption: "Kabosu says hi" } } }), true)
    assert.equal(namesThirdParty("x.json", { phases: { relaxed: { caption: "Fine.", frames: [["doge"]] } } }), false)
  })
})

describe("shipped themes", () => {
  const themesDir = new URL("../themes/", import.meta.url)
  const files = readdirSync(themesDir).filter((f) => f.endsWith(".json"))
  const load = (file) => JSON.parse(readFileSync(new URL(file, themesDir), "utf8"))

  test("classic, marine, shiba and boss exist", () => {
    for (const f of ["classic.json", "marine.json", "shiba.json", "boss.json"]) assert.ok(files.includes(f), f)
  })

  for (const file of files) {
    test(file + " parses and keeps its sprite", () => {
      const raw = load(file)
      const t = L.normalizeTheme(raw)
      assert.ok(t)
      assert.ok(/^[a-z0-9_-]{1,40}\.json$/.test(file), "not a valid theme name")
      assert.equal(t.cols > 0, raw.palette !== undefined, "sprite dropped, or palette without frames")
    })
  }

  test("classic: no art, no captions, progress bar", () => {
    const t = L.normalizeTheme(load("classic.json"))
    assert.equal(t.progress, true)
    assert.equal(t.cols, 0)
    for (const p of ["relaxed", "tense", "angry"]) assert.equal(t.phases[p].caption, "")
  })

  // every playful character is a 40x40 bust
  for (const [name, size] of [["marine", 40], ["shiba", 40], ["boss", 40]]) {
    test(name + ": three distinct expressions, captions, growing animation", () => {
      const t = L.normalizeTheme(load(name + ".json"))
      assert.equal(t.cols, size)
      assert.equal(t.rows, size)
      const ph = t.phases
      assert.equal(ph.relaxed.frames.length, 1)                                             // relaxed stands still
      assert.ok(ph.tense.frames.length >= 2 && ph.angry.frames.length >= 2)
      assert.ok(ph.angry.frameMs < ph.tense.frameMs, "angry animates faster than tense")
      assert.equal(ph.angry.shake, true)
      const first = (p) => ph[p].frames[0].join("\n")
      assert.equal(new Set([first("relaxed"), first("tense"), first("angry")]).size, 3)
      for (const p of ["relaxed", "tense", "angry"]) {
        assert.ok(ph[p].caption.length > 0, p + " caption")
        // a frame may repeat to hold a picture longer, but an animated phase shows at least two
        if (p !== "relaxed") assert.ok(new Set(ph[p].frames.map((f) => f.join("\n"))).size >= 2, p + " never changes")
      }
      assert.equal(ph.progress, undefined)
      assert.equal(t.progress, false)
    })
  }

  for (const name of ["marine", "shiba", "boss"])
  test(name + ": tense and angry play an intro once, then loop; the jolt waits for the loop", () => {
    const ph = L.normalizeTheme(load(name + ".json")).phases
    assert.ok(ph.tense.loopFrom > 0 && ph.tense.loopFrom < ph.tense.frames.length)
    assert.ok(ph.angry.loopFrom > 0 && ph.angry.loopFrom < ph.angry.frames.length)
    assert.equal(ph.angry.shake, true)
    assert.equal(L.joltOnEnter("angry", ph.angry), false)
    assert.equal(L.joltOnStep("angry", ph.angry, ph.angry.loopFrom - 1, ph.angry.loopFrom), true)
  })

  // what the generic tests let through: the boss's captions and timings, and fixed colors only
  test("boss: its captions, timings and fixed colors", () => {
    const raw = load("boss.json"), ph = L.normalizeTheme(raw).phases
    assert.deepEqual(["relaxed", "tense", "angry"].map((p) => ph[p].caption),
      ["Let's circle back.", "Can you see my screen?", "Again? The whole team is waiting."])
    assert.deepEqual([ph.tense.frames.length, ph.tense.frameMs, ph.tense.loopFrom], [12, 900, 8], "tense timing")
    assert.deepEqual([ph.angry.frames.length, ph.angry.frameMs, ph.angry.loopFrom, ph.angry.shake], [34, 120, 10, true], "angry timing")
    for (const [k, v] of Object.entries(raw.palette)) assert.ok(v === "transparent" || v.startsWith("#"), `boss palette ${k}: ${v} names a role`)
  })

  test("no third-party names in theme files", () => {
    for (const f of files) assert.equal(namesThirdParty(f, load(f)), false, f)
  })

  test("character sheets: tools/art/<theme>/character.json uses the schema's keys and labels, and matches its theme", () => {
    const artDir = new URL("../tools/art/", import.meta.url)
    const schema = JSON.parse(readFileSync(new URL("characters.schema.json", artDir), "utf8"))
    const keys = Object.keys(schema).filter((k) => !k.startsWith("_"))
    const names = readdirSync(artDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    assert.deepEqual(names.sort(), ["boss", "marine", "shiba"])
    for (const name of names) {
      const c = JSON.parse(readFileSync(new URL(name + "/character.json", artDir), "utf8")), where = name + "/character.json"
      assert.deepEqual(Object.keys(c).sort(), keys.slice().sort(), where + ": the schema's keys, no more, no fewer")
      for (const k of keys) {
        const { type, values } = schema[k], v = c[k], at = `${where} ${k}`
        if (type === "label") assert.ok(values.includes(v), `${at}: "${v}" is not a label of the schema; add it there first`)
        else if (type === "labels") assert.ok(Array.isArray(v) && v.every((x) => values.includes(x)), `${at}: ${JSON.stringify(v)} has a label not in the schema`)
        else if (type === "number") assert.equal(typeof v, "number", at)
        else if (type === "text") assert.equal(typeof v, "string", at)
        else if (type === "map") for (const [part, used] of Object.entries(v)) {
          assert.ok(schema[k].keys.includes(part), `${at}: part "${part}" is not in the schema`)
          assert.ok(Array.isArray(used) && used.every((x) => values.includes(x)), `${at}.${part}: ${JSON.stringify(used)} has a label not in the schema`)
        }
        else if (type === "version") assert.match(v, /^\d+\.\d+\.\d+$/, at)
        else assert.equal(type, "timing", at + ": unknown type")
      }
      assert.equal(c.status === "legacy", Number(c.version.split(".")[0]) < 1, where + ": legacy below 1.0.0, redrawn from 1.0.0")
      const t = L.normalizeTheme(load(name + ".json")), ph = t.phases
      for (const p of ["tense", "angry"])
        assert.deepEqual(c[p + ".timing"], { frames: ph[p].frames.length, ms: ph[p].frameMs, loopFrom: ph[p].loopFrom }, `${where} ${p}.timing`)
      assert.equal(c["palette.size"], Object.values(t.palette).filter((v) => v !== "transparent").length, where + " palette.size")
      assert.deepEqual(c["colors.roles"].slice().sort(), [...new Set(Object.values(t.palette).filter((v) => !v.startsWith("#") && v !== "transparent"))].sort(), where + " colors.roles")
      assert.equal(c["angry.flashes"], Math.max(...Object.values(CARDS).map((card) => worstFlashes(ph.angry, t.palette, card))), where + " angry.flashes")
    }
  })

  // the generic checks above only see that a label exists; these pin what the boss was approved as
  test("boss character sheet: the redrawn boss's values", () => {
    const c = JSON.parse(readFileSync(new URL("../tools/art/boss/character.json", import.meta.url), "utf8"))
    const want = {
      version: "1.0.0", status: "redrawn", "style.shading": "realistic", "tense.closeup": "held", "tense.sweat": "drop",
      "angry.intro": "flush", "angry.aura": "smoke", "angry.sign": "anger-mark", "angry.particles": "none",
      "angry.shake": "on-loop", "caption.voice": "jargon",
    }
    for (const [k, v] of Object.entries(want)) assert.equal(c[k], v, `boss/character.json ${k}`)
    assert.deepEqual(c["angry.faces"], ["yell", "scowl"], "boss/character.json angry.faces")
    assert.deepEqual(c["colors.roles"], [], "boss/character.json colors.roles")
    assert.ok(c["angry.flashes"] <= 2, "boss/character.json angry.flashes")
  })

  test("no sprite flashes more than twice a second, on a light or a dark card", () => {
    for (const f of files) {
      const t = L.normalizeTheme(load(f))
      for (const [k, v] of Object.entries(t.palette)) assert.ok(v === "transparent" || tokenRgba(v, CARDS.light), `${f} palette ${k}: ${v} is not a color the counter reads`)
      for (const [name, phase] of Object.entries(t.phases))
        for (const [cardName, card] of Object.entries(CARDS))
          if (phase.frames.length > 1) {
            const n = worstFlashes(phase, t.palette, card)
            assert.ok(n <= 2, `${f} ${name} on the ${cardName} card: ${n} flashes in one second`)
          }
    }
  })
})
