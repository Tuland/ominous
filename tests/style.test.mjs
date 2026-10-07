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

    test(file + " shows every Text, Label, TextEdit and TextArea as plain text", () => {
      // Qt's default AutoText renders a string that looks like markup as rich text, and rich
      // text loads <img> sources from the network: calendar data must never be parsed. Label is
      // a Text, TextEdit and TextArea show rich text too; TextInput and TextField do not.
      // An element is found wherever it starts (`contentItem: Text {`, `QQC.Label {`), and only
      // its own textFormat counts, not one of a nested element.
      const opening = /(?:^\s*|[:{]\s*)(?:\w+\.)?(Text|Label|TextEdit|TextArea)\s*\{/
      lines.forEach((l, i) => {
        const m = opening.exec(l)
        if (!m) return
        let depth = 0, j = i, own = false
        let line = l.slice(m.index + m[0].length - 1)
        do {
          // Only a textFormat written at depth 1, inside this element and not a nested one.
          for (const f of line.matchAll(/textFormat: Text\.PlainText/g)) {
            const before = line.slice(0, f.index)
            if (depth + (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length === 1) own = true
          }
          for (const ch of line) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0
          j++
          line = lines[j] || ""
        } while (depth > 0 && j < lines.length)
        assert.ok(own, file + ":" + (i + 1) + " has a " + m[1] + " without its own textFormat: Text.PlainText")
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
  for (const file of [...list("tests", ".sh"), ...list("tools", ".sh"), ...list(".githooks", "")]) {
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

describe("APIs that run or load from a string", () => {
  // Argued in docs/development.md, "Security", which lists the same names.
  const forbidden = ["eval(", "createQmlObject", "openUrlExternally", "Loader", "Image", "AnimatedImage", "XMLHttpRequest", "ToolTip",
                     "Qt.createComponent", "Qt.include", "FontLoader", "BorderImage", "AnimatedSprite", "MediaPlayer", "Video", "SoundEffect"]
  const files = ["Logic.js", ...list(".", ".qml"), ...list("components", ".qml")].map((f) => f.replace(/^\.\//, ""))
  // Only code counts: a comment may name an API to say it is not used.
  const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

  for (const file of files)
    test(file + " uses none of them", () => {
      const text = code(read(file))
      for (const api of forbidden) {
        const re = new RegExp(api.endsWith("(") ? api.replace("(", "\\(") : "\\b" + api + "\\b")
        assert.doesNotMatch(text, re, file + " uses " + api + "; argue it in docs/development.md, \"Security\", first")
      }
    })

  test("docs/development.md lists exactly these APIs", () => {
    const md = read("docs/development.md")
    const section = md.split("### APIs not allowed")[1].split("\n#")[0]
    const listed = [...section.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1])
    assert.deepEqual(listed, forbidden)
  })
})

describe("the journal", () => {
  // docs/development.md, "Security": a log line names an event by its id, never by its title,
  // place or calendar, which belong to whoever owns the calendar. A check of each log line,
  // not of the data flow: a value copied to a variable first would pass, so review still counts.
  for (const file of ["Service.qml", "Alert.qml", ...list("components", ".qml")])
    test(file + " logs no title, place or calendar name", () => {
      read(file).split("\n").forEach((l, i) => {
        if (/\b(root\.log|console\.log)\(/.test(l))
          assert.doesNotMatch(l, /\.(title|location|calendar)\b/, file + ":" + (i + 1) + " logs calendar text")
      })
    })
})

describe("the card's input guard", () => {
  // docs/development.md, "Security": every key and click that can join, dismiss or flip the
  // mode asks guardedNow() at the moment of the input. ActionButton has no guard of its own.
  test("every input handler of Alert.qml asks guardedNow()", () => {
    const lines = read("Alert.qml").split("\n")
    const handlers = lines.map((l, i) => [i, l]).filter(([, l]) => /\b(onClicked|onActivated|onToggled|Keys\.onPressed)\s*:/.test(l))
    assert.ok(handlers.length >= 5, "found the handlers")
    for (const [i, l] of handlers) {
      if (/onClicked:\s*\{\s*\}/.test(l)) continue   // the card's own area only stops clicks reaching the veil
      const body = lines.slice(i, i + 4).join("\n")
      assert.match(body, /guardedNow\(\)/, "Alert.qml:" + (i + 1) + " handles input without guardedNow()")
    }
  })
})

describe("lists written by hand that must not fall behind", () => {
  test("every function of Logic.js is in the index at the top of the file", () => {
    const text = read("Logic.js")
    const index = text.split("// ---------------------------------------------------------------- Constants")[0]
    for (const m of text.matchAll(/^function (\w+)\(/gm))
      assert.match(index, new RegExp("\\b" + m[1] + "\\b"), "Logic.js: " + m[1] + " is not in the index at the top")
  })

  test("every component is named in docs/development.md and CLAUDE.md", () => {
    for (const file of list("components", ".qml")) {
      const name = file.replace(/^components\//, "").replace(/\.qml$/, "")
      for (const doc of ["docs/development.md", "CLAUDE.md"])
        assert.ok(read(doc).includes("`" + name + "`"), doc + " does not name the component `" + name + "`")
    }
  })
})
