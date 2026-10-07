# Tasks

## 1. Logic

- [x] 1.1 `Logic.linkHost(url)` and `Logic.shortHost(host)`. Unit tests: user information (`meet.google.com@evil.example`), port, case, trailing dot, path/query/fragment, unsafe or empty link, a 60-character host shortened to its last 32 characters after "…"
- [x] 1.2 `joinHosts` in `CONFIG_FIELDS` (default 17 hosts, schema, `optional` hosts) and in `normalizeConfig` (list only; trimmed, lower-cased, valid hosts, no duplicates; empty list kept). Unit tests: missing, not a list, empty, mixed valid and invalid entries
- [x] 1.3 `Logic.joinTarget(url, hosts)` with `SERVICE_NAMES`, replacing `provider`. Unit tests: every default host and a subdomain of each recognized with its service name; look-alikes (`zoom.us.evil.example`, `evilzoom.us`, `meet.google.com@evil.example`) not recognized; a user-only list; an empty list; a trusted host without a service name labelled by its host
- [x] 1.4 `Logic.initialSelection(url, trusted)` and `Logic.unknownLinkTip(host)`. Unit tests: trusted link selects Join, untrusted selects Dismiss, no link selects Dismiss; the tip names the host and the file, warns on non-ASCII, and the existing key tests still pass
- [x] 1.5 `look` and `normalizePayload` carry `joinHosts`, validated the same way; a payload without it gets the default. Unit tests
- [x] 1.6 `formatConfig` prints a field with `optional` as a multi-line list with the optional values commented; `configSchema` lists them as `examples`. Unit tests: the output reads back to the same config; an optional value already active is not repeated; removing `//` in front of one adds it. Regenerate the example and the schema with `tools/make-config-docs.mjs`

## 2. Card

- [x] 2.1 `components/LinkNotice.qml` ("?", hover, click toggles, `PanelToolTip`); `Alert.qml` uses `joinTarget` for the label, `initialSelection` with `trusted`, and shows `LinkNotice` next to Join only for an untrusted link. Verify `tools/lint.sh` passes and the style tests pass
- [x] 2.2 `tools/shoot-card.sh` takes an optional link. Photograph a recognized link, an unknown link, a very long unknown host and `meet.google.com@evil.example`; then, with the overlay open, select Join with `wtype` and photograph the tooltip. Look at every picture: Dismiss selected and "?" only for unknown links, real host shown, card size unchanged, tooltip readable inside the screen
- [x] 2.3 `tests/live.sh`: a summoned card with an unknown link opens and closes; with `--keys`, Enter on it dismisses without opening anything (no new browser process). Verify `mise exec -- tests/run.sh --restart --keys` passes

## 3. Docs

- [x] 3.1 `docs/configuration.md`: `joinHosts` row, the default and optional hosts, the subdomain rule and its consequence, how to add a host. `docs/usage.md`: the "?" and what Enter does on an unknown link. Verify the docs tests pass
- [x] 3.2 `CHANGELOG.md` under `Unreleased`: Added (`joinHosts`, the "?" and tooltip) and Changed (**unknown links open with Dismiss selected**; the button shows the real host). Verify the changelog test passes
