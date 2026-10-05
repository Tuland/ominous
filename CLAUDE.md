# Ominous — agent notes

An Omarchy shell plugin (`tuland.ominous`, kinds `service` + `overlay`). See `README.md` for
what it does and `openspec/` for specs and changes.

## Layout

- `Service.qml` — polls `omacal agenda --json` every 60 s, checks the alert window every 5 s,
  summons the overlay through the injected `shell.summon(id, payloadJson)`; IPC target
  `ominous` (`test`, `status`).
- `Alert.qml` — the overlay: `open(payloadJson)` / `close()`, a `PanelWindow` on
  `WlrLayer.Overlay`, theme tokens from `qs.Commons` (`Color`, `Style`, `Util`, `Border`).
- `Logic.js` — pure helpers, no QML types, so node can run them.

Reference for the shell API: `/usr/share/omarchy/shell/` (read only — never edit it).

## Rules

- Everything in English: code, comments, UI strings, docs, commit messages.
- No personal or employer data anywhere: no real emails, calendar names, meeting links, home
  paths. Use placeholders such as `work@example.com`.
- Calendar data is untrusted input: only `https://` URLs are ever opened (`Logic.safeUrl`).
- The status IPC never prints meeting titles.
- Commits and pushes wait for the user to ask.

## Checking a change

```bash
node tests/logic.test.mjs        # logic checks
omarchy restart shell            # QML changes: an already-summoned overlay keeps old code
omarchy-shell ominous test       # synthetic alert now
omarchy-shell ominous status     # config, counts, next start, last error
```
