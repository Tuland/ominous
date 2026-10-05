// The README and docs/ stay true to the code, and every link in them leads somewhere.
import { readFileSync, readdirSync, existsSync } from "node:fs"
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L } from "./helpers.mjs"

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const exists = (path) => existsSync(new URL("../" + path, import.meta.url))
const docs = readdirSync(new URL("../docs/", import.meta.url)).filter((f) => f.endsWith(".md"))
// Markdown links to local files: [text](path), without anchors or web addresses.
const localLinks = (md) => [...md.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)].map((m) => m[1]).filter((p) => !/^[a-z]+:/.test(p))

describe("README", () => {
  const readme = read("README.md")

  test("indexes every page in docs/", () => {
    for (const f of docs) assert.ok(readme.includes("](docs/" + f + ")"), "README links docs/" + f)
  })

  test("every local link leads to a file", () => {
    for (const p of localLinks(readme)) assert.ok(exists(p), "README links a missing " + p)
  })
})

describe("docs", () => {
  test("every local link leads to a file", () => {
    for (const f of docs)
      for (const p of localLinks(read("docs/" + f))) assert.ok(exists("docs/" + p), f + " links a missing " + p)
  })

  test("configuration.md documents every config key", () => {
    const md = read("docs/configuration.md")
    for (const key of Object.keys(L.normalizeConfig(null)))
      assert.ok(md.includes("| `" + key + "` |"), "configuration.md documents " + key)
  })

  test("custom-themes.md has a theme example that is valid and keeps its sprite", () => {
    const md = read("docs/custom-themes.md")
    const example = md.split("```json").slice(1).map((b) => b.split("```")[0]).find((b) => b.includes('"phases"'))
    assert.ok(example, "custom-themes.md has a theme example")
    const t = L.normalizeTheme(JSON.parse(example))
    assert.ok(t && t.cols === 4 && t.rows === 2)
  })

  test("usage.md shows every IPC command the service answers", () => {
    const service = read("Service.qml")
    const ipc = service.slice(service.indexOf("IpcHandler"))
    const commands = [...ipc.matchAll(/function (\w+)\([^)]*\): string/g)].map((m) => m[1])
    assert.ok(commands.length >= 5, "found the IPC functions")
    const md = read("docs/usage.md")
    // a whole word: "theme" must not pass because "themes" is there
    for (const c of commands) assert.match(md, new RegExp("omarchy-shell ominous " + c + "(?![\\w-])"), "usage.md shows " + c)
  })

  test("themes.md lists every shipped theme", () => {
    const md = read("docs/themes.md")
    for (const f of readdirSync(new URL("../themes/", import.meta.url)).filter((f) => f.endsWith(".json")))
      assert.ok(md.includes("| `" + f.replace(".json", "") + "` |"), "themes.md lists " + f)
  })
})

describe("ominous skills", () => {
  const skills = readdirSync(new URL("../.claude/skills/", import.meta.url)).filter((d) => d.startsWith("ominous-"))

  test("exist", () => {
    for (const s of ["ominous-theme", "ominous-release"]) assert.ok(skills.includes(s), "skill " + s)
  })

  for (const s of skills) {
    test(s + " names only files that exist", () => {
      const skill = read(".claude/skills/" + s + "/SKILL.md")
      // Backticked repo paths, e.g. `tools/shoot-card.sh` or `tests/themes.test.mjs`.
      const paths = [...skill.matchAll(/`((?:tools|tests|docs|themes|openspec|components)\/[\w./-]+?)`/g)]
        .map((m) => m[1]).filter((p) => !p.includes("<"))
      assert.ok(paths.length >= 5, "found the paths the skill names")
      for (const p of paths) assert.ok(exists(p), "the skill names a missing " + p)
    })
  }
})
