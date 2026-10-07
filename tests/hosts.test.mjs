// Which join links are recognized: the host a browser opens, the recognized list, the button and the tip.
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

  test("a long host loses its start, keeping the last characters", () => {
    const host = "a".repeat(28) + ".evil" + "b".repeat(27)
    assert.equal(host.length, 60)
    assert.equal(L.shortHost(host, 32), "\u2026" + host.slice(-32))
    assert.equal(L.shortHost("x".repeat(32), 32), "x".repeat(32))
    assert.equal(L.shortHost("x".repeat(65), 64), "\u2026" + "x".repeat(64))
    assert.equal(L.shortHost("meet.example", 32), "meet.example")
  })

  test("characters outside printable ASCII are shown as escapes", () => {
    assert.equal(L.displayHost("meet.google.com"), "meet.google.com")
    assert.equal(L.displayHost("\u202eelpmaxe.live"), "\\u202eelpmaxe.live")
    assert.equal(L.displayHost("m\u0435et.google.com"), "m\\u0435et.google.com")
    assert.equal(L.displayHost("meet.google.com\u200b.evil"), "meet.google.com\\u200b.evil")
    assert.equal(L.displayHost("evil.example\u3002zoom.us"), "evil.example\\u3002zoom.us")
    assert.equal(L.displayHost("a\u0000b c"), "a\\u0000b\\u0020c")
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
        assert.equal(t.recognized, true, url)
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
      assert.equal(t.recognized, false, url)
      assert.equal(t.label, L.shortHost(L.displayHost(t.host), 32), url)
    }
    assert.equal(L.joinTarget("https://meet.google.com@evil.example/x", defaults).label, "evil.example")
  })

  test("only the user's own list counts", () => {
    assert.equal(L.joinTarget("https://meet.acme.example/x", ["meet.acme.example"]).recognized, true)
    assert.equal(L.joinTarget("https://meet.acme.example/x", ["meet.acme.example"]).label, "meet.acme.example")
    assert.equal(L.joinTarget("https://meet.google.com/x", ["meet.acme.example"]).recognized, false)
    assert.equal(L.joinTarget("https://meet.google.com/x", ["meet.acme.example"]).label, "meet.google.com")
    assert.equal(L.joinTarget("https://meet.google.com/x", []).recognized, false)
  })

  test("a long untrusted host is shortened on the button", () => {
    const t = L.joinTarget("https://" + "a".repeat(60) + ".example/", defaults)
    assert.equal(t.label.length, 33)
    assert.equal(t.label[0], "…")
    assert.equal(t.host.length, 68)
  })

  test("no link, nothing", () => {
    assert.deepEqual({ ...L.joinTarget("", defaults) }, { host: "", recognized: false, label: "" })
    assert.deepEqual({ ...L.joinTarget("http://zoom.us/", defaults) }, { host: "", recognized: false, label: "" })
  })

  test("the tip names the host and the file, as plain text", () => {
    const tip = L.unknownLinkTip("evil.example")
    assert.match(tip, /evil\.example/)
    assert.match(tip, /joinHosts/)
    assert.match(tip, /~\/\.config\/omarchy\/ominous\.json/)
    assert.match(tip, /make Join the default/)
    assert.doesNotMatch(tip, /outside plain ASCII/)
    assert.match(L.unknownLinkTip("m\u0435et.google.com"), /outside plain ASCII/)
  })

  test("hosts that mimic another are shown escaped and never recognized", () => {
    for (const host of ["\u202eelpmaxe.live", "meet.google.com\u200b.evil.example", "m\u0435et.google.com", "evil.example\u3002zoom.us"]) {
      const t = L.joinTarget("https://" + host + "/x", defaults)
      assert.equal(t.recognized, false, host)
      assert.doesNotMatch(t.label, /[^\x21-\x7e\u2026 ]/, "label of " + host + " has a raw character")
      assert.match(L.unknownLinkTip(t.host), /outside plain ASCII/)
      assert.doesNotMatch(L.unknownLinkTip(t.host), /[^\x20-\x7e\n\u2026]/)
    }
  })

  test("a 2000-character host cannot widen the tooltip", () => {
    const lines = L.unknownLinkTip("a".repeat(2000) + ".example").split("\n")
    assert.equal(lines[1].length, 65)
    assert.match(lines[1], /^\u2026a+\.example$/)
  })

  test("no line of the tip is longer than 65 characters, so it stays inside the card", () => {
    for (const host of ["evil.example", "a".repeat(2000) + ".example", "\u202e".repeat(300), "m\u0435et.google.com", ""]) {
      const lines = L.unknownLinkTip(host).split("\n")
      assert.ok(lines.length === 5 || lines.length === 7, host.length + " chars gave " + lines.length + " lines")
      for (const line of lines) assert.ok(line.length <= 65, "line of " + line.length + " characters")
    }
    assert.equal(L.unknownLinkTip("evil.example").split("\n")[1], "evil.example")
  })

  test("shortening never leaves half of an escape", () => {
    const t = L.joinTarget("https://" + "\u0435".repeat(20) + "vil.com/", [])
    assert.match(t.label, /^\u2026(\\u0435)+vil\.com$/)
    assert.ok(t.label.length <= 33)
  })

  test("escaping comes before shortening, so escapes cannot make a label longer", () => {
    const t = L.joinTarget("https://" + "\u202e".repeat(40) + ".example/", defaults)
    assert.ok(t.label.length <= 33)
  })

  test("RingCentral meeting links are recognized, the rest of its domain is not", () => {
    assert.equal(L.joinTarget("https://v.ringcentral.com/join/123456", defaults).label, "RingCentral")
    assert.equal(L.joinTarget("https://community.ringcentral.com/x", defaults).recognized, false)
    assert.equal(L.joinTarget("https://ringcentral.com/x", defaults).recognized, false)
  })

  test("every default host has a service name, from the one table", () => {
    assert.deepEqual([...defaults], [...L.JOIN_SERVICES].map((e) => e[0]))
    assert.ok(![...L.OPTIONAL_JOIN_HOSTS].some((h) => defaults.includes(h)))
    assert.ok([...L.OPTIONAL_JOIN_HOSTS].includes("meetings.ringcentral.com"))
  })
})

describe("links with no real host", () => {
  test("a link with no host is no link", () => {
    for (const url of ["https:///evil.com/x", "https:////evil.com", "https://user@/x", "https://:8080/x", "https://./x", "https:///"])
      assert.equal(L.safeUrl(url), "", url)
    assert.equal(L.joinTarget("https:///evil.com/x", defaults).label, "")
    assert.equal(L.initialSelection(L.safeUrl("https:///evil.com/x"), false), 1)
  })

  test("a link with $ is no link: systemd would expand ${VAR} before the browser sees it", () => {
    for (const url of ["https://evil.example${HOME}@meet.google.com/abc", "https://meet.google.com/x?u=${USER}", "https://meet.google.com/$HOME"])
      assert.equal(L.safeUrl(url), "", url)
    assert.equal(L.joinTarget("https://evil.example${HOME}@meet.google.com/abc", defaults).label, "")
  })

  test("a link with --private is no link: the browser launcher rewrites it in every argument", () => {
    for (const url of ["https://meet--private.example.com/x", "https://meet.google.com/abc?x=--private"])
      assert.equal(L.safeUrl(url), "", url)
    assert.equal(L.safeUrl("https://meet.google.com/abc-private"), "https://meet.google.com/abc-private")
  })

  test("a host with a % escape is no link: the browser would open the decoded host", () => {
    for (const url of ["https://evil%2Eexample/", "https://meet.google.com%E3%80%82evil.example/", "https://evil.com%23.meet.google.com/"])
      assert.equal(L.safeUrl(url), "", url)
    assert.equal(L.safeUrl("https://meet.google.com/abc?x=%20y"), "https://meet.google.com/abc?x=%20y")
  })

  test("a link longer than 2048 characters is no link, and a run of dots costs no time", () => {
    assert.equal(L.safeUrl("https://meet.google.com/" + "a".repeat(2100)), "")
    const start = Date.now()
    assert.equal(L.hostOf("https://" + ".".repeat(100000) + "x/"), ".".repeat(100000) + "x")
    assert.equal(L.hostOf("https://zoom.us" + ".".repeat(100000) + "/"), "zoom.us")
    assert.ok(Date.now() - start < 200, "took " + (Date.now() - start) + " ms")
  })

  test("a link with a control character is no link", () => {
    for (const url of ["https://meet.google.com\u0000/x", "https://meet.google.com/x\u001f", "https://meet.google.com/\u007f", "https://a.com\u0085x", "https://a.com/\u009f"])
      assert.equal(L.safeUrl(url), "", JSON.stringify(url))
    assert.equal(L.safeUrl("https://meet.google.com/abc-defg-hij?a=%20b#x"), "https://meet.google.com/abc-defg-hij?a=%20b#x")
  })

  test("a host with anything but letters, digits, hyphens and dots is never recognized", () => {
    for (const url of ["https://evil.com:80.meet.google.com/", "https://evil.com%23.meet.google.com/", "https://evil.com\u200b.meet.google.com/",
                       "https://exa\u0000mple.zoom.us/", "https://evil.com\u202e.meet.google.com/", "https://a_b.zoom.us/"]) {
      const t = L.joinTarget(url, defaults)
      if (L.safeUrl(url) === "") continue
      assert.equal(t.recognized, false, url)
      assert.notEqual(t.label, "Meet", url)
      assert.notEqual(t.label, "Zoom", url)
    }
    assert.equal(L.joinTarget("https://us02web.zoom.us/j/1", defaults).recognized, true)
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
