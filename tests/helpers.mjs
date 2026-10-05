// Loads Logic.js the way QML does (minus the pragma) and shares the fixtures every test file uses.
// Run all tests: node --test tests/      (tests/run.sh also runs the live checks)
import { readFileSync } from "node:fs"
import vm from "node:vm"

export const L = {}
vm.runInNewContext(readFileSync(new URL("../Logic.js", import.meta.url), "utf8").replace(".pragma library", ""), L)

export const cfg = L.normalizeConfig({ calendars: ["Work@Example.com"], leadSeconds: 60 })
export const now = 1_000_000_000_000
export const ev = (o) => ({ eventId: 1, calendar: "work@example.com", calendarId: 7, startMs: now + 30_000,
                            allDay: false, response: "accepted", ...o })
