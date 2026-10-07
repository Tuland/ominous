#!/usr/bin/env node
// Writes the two files derived from the config declaration in Logic.js:
//   docs/ominous.example.jsonc   the printed config with every default, to copy as a start
//   docs/ominous.schema.json     the JSON Schema editors use for ominous.json
//   tools/make-config-docs.mjs          write both
//   tools/make-config-docs.mjs --check  write nothing; exit 1 if a file differs from the code
// Both come from the defaults only, never from anyone's own ominous.json.
// tests/docs.test.mjs fails when they are out of date.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import vm from "node:vm"

const root = new URL("../", import.meta.url)
const L = {}
vm.runInNewContext(readFileSync(new URL("Logic.js", root), "utf8").replace(".pragma library", ""), L)

/** The files this script owns, by path from the repository root, with their expected text. */
export const generated = () => ({
  "docs/ominous.example.jsonc": L.formatConfig(L.normalizeConfig(null), []),
  "docs/ominous.schema.json": JSON.stringify(L.configSchema(), null, 2) + "\n",
})

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check")
  let stale = 0
  for (const [path, text] of Object.entries(generated())) {
    const file = fileURLToPath(new URL(path, root))
    let current = ""
    try { current = readFileSync(file, "utf8") } catch { /* missing counts as out of date */ }
    if (check) {
      if (current !== text) { console.error(path + " is out of date: run tools/make-config-docs.mjs"); stale++ }
    } else {
      writeFileSync(file, text)
      console.log("wrote " + path)
    }
  }
  process.exit(stale ? 1 : 0)
}
