// How Ominous is identified and presented: one plugin ID everywhere, the marketplace's needs.
import { readFileSync, readdirSync } from "node:fs"
import assert from "node:assert/strict"
import { describe, test } from "node:test"

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const manifest = JSON.parse(read("manifest.json"))
const listMd = (dir) => readdirSync(new URL("../" + dir + "/", import.meta.url)).filter((f) => f.endsWith(".md")).map((f) => dir + "/" + f)
const listDir = (dir, ext) => readdirSync(new URL("../" + dir + "/", import.meta.url)).filter((f) => f.endsWith(ext)).map((f) => dir + "/" + f)

describe("plugin ID", () => {
  test("is the namespaced, permanent one", () => {
    assert.equal(manifest.id, "io.github.tuland.ominous")
  })

  test("every plugin ID written in code, scripts and docs is the manifest's", () => {
    const files = ["Alert.qml", "Service.qml", "README.md", "CLAUDE.md", "openspec/config.yaml",
                   ...listDir("components", ".qml"), ...listDir("tests", ".sh"), ...listMd("docs")]
    let seen = 0
    for (const f of files) {
      for (const m of read(f).matchAll(/\b(?:[a-z0-9-]+\.)+ominous\b/g)) {
        seen++
        assert.equal(m[0], manifest.id, f + " names the plugin " + m[0])
      }
    }
    assert.ok(seen >= 5, "found the places that name the plugin")
  })
})

describe("what the marketplace search reads", () => {
  // The site searches the manifest's name and description (plus ID, author, category, tags),
  // never the README: these are the words people look for.
  test("the name says meeting", () => {
    assert.match(manifest.name, /\bMeeting\b/)
  })

  test("the description names OmaCal and the calendar words people search", () => {
    for (const word of ["Meeting", "alert", "OmaCal", "calendar", "Google Calendar"])
      assert.ok(manifest.description.includes(word), "description mentions " + word)
    assert.doesNotMatch(manifest.description, /meetingbar/i, "no other product's name as a search hook")
  })
})

describe("README for the marketplace", () => {
  const readme = read("README.md")
  const section = (title) => (readme.split(/^## /m).find((s) => s.startsWith(title)) || "")

  test("installs with omarchy plugin add from the repository", () => {
    assert.match(section("Install"), /omarchy plugin add https:\/\/github\.com\/[\w-]+\/[\w-]+\.git --enable/)
  })

  test("removes with omarchy plugin remove and the plugin ID", () => {
    assert.ok(section("Uninstall").includes("omarchy plugin remove " + manifest.id))
  })

  test("names every file Ominous leaves behind", () => {
    const s = section("Uninstall")
    for (const p of ["~/.config/omarchy/ominous.json", "~/.config/omarchy/ominous", "~/.local/state/ominous"])
      assert.ok(s.includes(p), "Uninstall names " + p)
  })

  test("says it needs OmaCal before anything else, with links", () => {
    const top = readme.slice(0, readme.indexOf("\n## "))
    const firstBlock = top.split(/\n\s*\n/).find((b) => !b.startsWith("#"))
    assert.match(firstBlock, /Requires \[OmaCal\]\(https:\/\/omacal\.app\)/)
    assert.match(firstBlock, /https:\/\/github\.com\/x3me\/omacal/)
  })

  test("states its requirements, OmaCal among them", () => {
    const s = section("Requirements")
    assert.match(s, /\[OmaCal\]\(https:\/\/omacal\.app\)/)
    assert.match(s, /`omacal`/)
    assert.match(s, /omarchy plugin/)
  })
})

describe("preview image", () => {
  test("preview.png is a PNG of at least 1600x900", () => {
    const png = readFileSync(new URL("../preview.png", import.meta.url))
    assert.equal(png.subarray(1, 4).toString("latin1"), "PNG")
    // IHDR comes first: width and height are big-endian at bytes 16 and 20.
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
    assert.ok(width >= 1600 && height >= 900, `preview.png is ${width}x${height}`)
  })
})
