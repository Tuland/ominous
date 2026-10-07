// Which join links are trusted: the host a browser opens, the trusted list, the button and the tip.
import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { L } from "./helpers.mjs"

const defaults = [...L.DEFAULTS.joinHosts]

describe("link host", () => {
  test("the host is the one the browser connects to", () => {
    assert.equal(L.linkHost("https://Meet.Google.com/abc"), "meet.google.com")
    assert.equal(L.linkHost("https://meet.google.com@evil.example/abc"), "evil.example")
    assert.equal(L.linkHost("https://user:pw@zoom.us:8443/j/1?x=1#y"), "zoom.us")
    assert.equal(L.linkHost("https://a@b@zoom.us/"), "zoom.us")
    assert.equal(L.linkHost("https://zoom.us./j/1"), "zoom.us")
    assert.equal(L.linkHost("https://zoom.us?x=1"), "zoom.us")
    assert.equal(L.linkHost("https://zoom.us#frag"), "zoom.us")
    assert.equal(L.linkHost("https://evil.example/@zoom.us"), "evil.example")
  })

  test("no safe link, no host", () => {
    for (const bad of ["", null, undefined, "http://zoom.us/", "javascript:alert(1)", "https://a b/", "https://x\\@zoom.us/"])
      assert.equal(L.linkHost(bad), "", String(bad))
  })

  test("a long host loses its start, keeping the last 32 characters", () => {
    const host = "a".repeat(28) + ".evil" + "b".repeat(27)
    assert.equal(host.length, 60)
    assert.equal(L.shortHost(host), "…" + host.slice(-32))
    assert.equal(L.shortHost("x".repeat(32)), "x".repeat(32))
    assert.equal(L.shortHost("meet.example"), "meet.example")
  })
})

describe("join hosts", () => {
  test("the default is 17 hosts", () => assert.equal(defaults.length, 17))

  test("joinHosts: missing or not a list keeps the default", () => {
    for (const bad of [undefined, null, "zoom.us", 7, { a: 1 }])
      assert.deepEqual([...L.normalizeConfig({ joinHosts: bad }).joinHosts], defaults, String(bad))
    assert.deepEqual([...L.normalizeConfig(null).joinHosts], defaults)
  })

  test("joinHosts: the user's list replaces the default, an empty one included", () => {
    assert.deepEqual([...L.normalizeConfig({ joinHosts: ["meet.acme.example"] }).joinHosts], ["meet.acme.example"])
    assert.deepEqual([...L.normalizeConfig({ joinHosts: [] }).joinHosts], [])
  })

  test("joinHosts: entries are cleaned", () => {
    const hosts = L.normalizeConfig({ joinHosts: [" Zoom.US ", "https://zoom.us/", "not a host", "com", "zoom.us.", "a.b/c", 5, null, "meet.jit.si"] }).joinHosts
    assert.deepEqual([...hosts], ["zoom.us", "meet.jit.si"])
  })

  test("every default host is recognized, and so is a subdomain of it, with a service name", () => {
    for (const h of defaults) {
      for (const url of [`https://${h}/x`, `https://eu.team.${h}/x`, `https://${h.toUpperCase()}:443/x`]) {
        const t = L.joinTarget(url, defaults)
        assert.equal(t.trusted, true, url)
        assert.notEqual(t.label, t.host, url)
      }
    }
    assert.equal(L.joinTarget("https://meet.google.com/abc-defg-hij", defaults).label, "Meet")
    assert.equal(L.joinTarget("https://us02web.zoom.us/j/1", defaults).label, "Zoom")
  })

  test("look-alikes are not recognized", () => {
    for (const url of ["https://zoom.us.evil.example/j/1", "https://evilzoom.us/j/1", "https://meet.google.com@evil.example/x",
                       "https://evil.example/meet.google.com", "https://zoom.us.evil.example@zoom.us.evil.example/", "https://notmeet.google.com.evil/x"]) {
      const t = L.joinTarget(url, defaults)
      assert.equal(t.trusted, false, url)
      assert.equal(t.label, L.shortHost(t.host), url)
    }
    assert.equal(L.joinTarget("https://meet.google.com@evil.example/x", defaults).label, "evil.example")
  })

  test("only the user's own list counts", () => {
    assert.equal(L.joinTarget("https://meet.acme.example/x", ["meet.acme.example"]).trusted, true)
    assert.equal(L.joinTarget("https://meet.acme.example/x", ["meet.acme.example"]).label, "meet.acme.example")
    assert.equal(L.joinTarget("https://meet.google.com/x", ["meet.acme.example"]).trusted, false)
    assert.equal(L.joinTarget("https://meet.google.com/x", ["meet.acme.example"]).label, "meet.google.com")
    assert.equal(L.joinTarget("https://meet.google.com/x", []).trusted, false)
  })

  test("a long untrusted host is shortened on the button", () => {
    const t = L.joinTarget("https://" + "a".repeat(60) + ".example/", defaults)
    assert.equal(t.label.length, 33)
    assert.equal(t.label[0], "…")
    assert.equal(t.host.length, 68)
  })

  test("no link, nothing", () => {
    assert.deepEqual({ ...L.joinTarget("", defaults) }, { host: "", trusted: false, label: "" })
    assert.deepEqual({ ...L.joinTarget("http://zoom.us/", defaults) }, { host: "", trusted: false, label: "" })
  })

  test("the tip names the host and the file, as plain text", () => {
    const tip = L.unknownLinkTip("evil.example")
    assert.match(tip, /evil\.example/)
    assert.match(tip, /joinHosts/)
    assert.match(tip, /~\/\.config\/omarchy\/ominous\.json/)
    assert.doesNotMatch(tip, /non-Latin/)
    assert.match(L.unknownLinkTip("mеet.google.com"), /non-Latin/)
  })
})

describe("join hosts in the payload", () => {
  test("look carries the hosts, normalizePayload checks them again", () => {
    const cfg = L.normalizeConfig({ joinHosts: ["meet.acme.example"] })
    assert.deepEqual([...L.look(cfg, "professional", {}).joinHosts], ["meet.acme.example"])
    const p = L.normalizePayload({ joinHosts: [" Meet.Acme.Example ", "https://evil/", 3] })
    assert.deepEqual([...p.joinHosts], ["meet.acme.example"])
  })

  test("a payload without hosts, or with a bad value, gets the default", () => {
    for (const bad of [undefined, null, "zoom.us", 4])
      assert.deepEqual([...L.normalizePayload({ joinHosts: bad }).joinHosts], defaults, String(bad))
    assert.deepEqual([...L.normalizePayload({ joinHosts: [] }).joinHosts], [])
  })
})
