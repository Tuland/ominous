// Every function, component and script carries a doc comment in the repository's style
// (docs/development.md, "Code style"): JSDoc in Logic.js and QML, the Google Shell Style Guide
// in scripts, Google docstrings in Python. These checks read the source as text: they prove
// a comment is there and names each parameter, not that it is true.
import { readFileSync, readdirSync } from "node:fs"
import assert from "node:assert/strict"
import { describe, test } from "node:test"

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const list = (dir, ext) => readdirSync(new URL("../" + dir + "/", import.meta.url)).filter((f) => f.endsWith(ext)).map((f) => dir + "/" + f)

/**
 * The comment block that ends on the line directly above line `i`, or "" when there is none.
 *
 * @param {string[]} lines The file's lines.
 * @param {number} i The index of the declaration's line.
 * @returns {string}
 */
function blockAbove(lines, i) {
  if (!/\*\/\s*$/.test(lines[i - 1] || "")) return ""
  let j = i - 1
  while (j >= 0 && !/^\s*\/\*\*/.test(lines[j])) j--
  return j < 0 ? "" : lines.slice(j, i).join("\n")
}

describe("Logic.js", () => {
  const lines = read("Logic.js").split("\n")
  const fns = lines.map((l, i) => [i, /^function (\w+)\(([^)]*)\)/.exec(l)]).filter(([, m]) => m)

  test("has its functions", () => assert.ok(fns.length >= 30, "found the functions"))

  for (const [i, m] of fns) {
    test(m[1] + " has JSDoc with each @param and @returns", () => {
      const doc = blockAbove(lines, i)
      assert.ok(doc !== "", m[1] + " has no /** */ block directly above")
      for (const p of m[2].split(",").map((s) => s.trim()).filter((s) => s !== ""))
        assert.match(doc, new RegExp("@param \\{.*\\} " + p + "\\b"), m[1] + " documents @param " + p)
      assert.match(doc, /@returns \{/, m[1] + " documents @returns")
    })
  }
})

describe("QML", () => {
  for (const file of ["Alert.qml", "Service.qml", ...list("components", ".qml")]) {
    const lines = read(file).split("\n")

    test(file + " starts its root object with a doc block", () => {
      const root = lines.findIndex((l) => /^[A-Z]\w* \{/.test(l))
      assert.ok(root > 0 && blockAbove(lines, root) !== "", file + " has no /** */ block above its root object")
    })

    test(file + " shows every Text as plain text", () => {
      // Qt's default AutoText renders a string that looks like markup as rich text, and rich
      // text loads <img> sources from the network: calendar data must never be parsed.
      lines.forEach((l, i) => {
        if (!/^\s*Text\s*\{/.test(l)) return
        let depth = 0, j = i, body = ""
        do {
          for (const ch of lines[j]) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0
          body += lines[j] + "\n"
          j++
        } while (depth > 0 && j < lines.length)
        assert.match(body, /textFormat: Text\.PlainText/, file + ":" + (i + 1) + " has a Text without textFormat: Text.PlainText")
      })
    })

    test(file + " documents every function", () => {
      lines.forEach((l, i) => {
        const m = /^\s*function (\w+)\(/.exec(l)
        if (m) assert.ok(blockAbove(lines, i) !== "", file + ": " + m[1] + " has no /** */ block directly above")
      })
    })
  }
})

describe("scripts", () => {
  for (const file of [...list("tests", ".sh"), ...list("tools", ".sh")]) {
    const text = read(file)
    const lines = text.split("\n")

    test(file + " has a header comment", () => {
      assert.match(lines[0], /^#!/)
      assert.match(lines[1], /^#/, file + " has no comment right after the shebang")
    })

    test(file + " documents every function", () => {
      lines.forEach((l, i) => {
        const m = /^\s*([a-z_]+)\(\) *\{/.exec(l)
        if (!m) return
        // A check in tests/live.sh is described by its `check "..."` line instead.
        if (new RegExp('^\\s*check "[^"\\n]*" ' + m[1] + "\\b", "m").test(text)) return
        assert.match(lines[i - 1] || "", /^\s*#/, file + ": " + m[1] + " has no comment directly above")
      })
    })
  }
})

describe("Python", () => {
  for (const file of list("tools", ".py")) {
    test(file + " has a docstring on the module and every function", () => {
      const lines = read(file).split("\n")
      assert.match(lines[1], /^"""/, file + " has no module docstring")
      lines.forEach((l, i) => {
        const m = /^\s*def (\w+)\(/.exec(l)
        if (m) assert.match(lines[i + 1] || "", /^\s*"""/, file + ": " + m[1] + " has no docstring")
      })
    })
  }
})
