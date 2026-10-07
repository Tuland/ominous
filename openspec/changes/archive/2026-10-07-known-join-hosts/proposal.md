# Proposal

## Why

When a meeting has a link, the card opens with Join selected, so Enter opens it. The link comes
from the calendar, and on a shared calendar its owner chooses it: any `https://` page becomes
one keystroke away, phishing included, with nothing on the card telling a known meeting service
from an unknown site. The button even reads "Join on browser" for an unknown host, which hides
where the link goes. The host is also taken from the link naively:
`https://meet.google.com@evil.example/` shows as a Meet-like host while the browser opens
`evil.example`. Found by the security audit after marketplace issue
omacom/omarchy-plugin-marketplace#10156; part of 0.3.0.

## What Changes

- New `ominous.json` key `joinHosts`: the meeting hosts the user trusts. One list, under the
  user's full control: when set it replaces the default, when missing the default applies. A
  host also covers its subdomains at any depth (`zoom.us` covers `us02web.zoom.us`), without
  regard to case. The default holds 17 hosts of 11 services (Google Meet, Zoom, Microsoft
  Teams, Webex, Jitsi, Whereby, GoTo Meeting, RingCentral, 8x8, Proton Meet, FaceTime). Other
  meeting hosts appear commented out in the printed config and the example file, ready to
  enable.
- The host is the one the browser opens: user info (`name@`), port, path and case are ignored,
  so a trick like `meet.google.com@evil.example` shows and is checked as `evil.example`.
- **BREAKING (behavior):** a link whose host is not in the list opens the card with Dismiss
  selected; the button reads "Join on <host>" with the real host, shortened with "…" when long,
  and a small "?" sits next to it. A tooltip explains that the link is not recognized and where
  to add the host; it shows while Join is selected and when the "?" is hovered or clicked. Cards
  with a recognized link or no link look and behave as before.
- The join hosts travel with the alert payload, and the overlay checks them again like every
  other payload field.
- `docs/configuration.md` (the key, the default and optional hosts, the subdomain rule),
  `docs/usage.md` (the "?"), the example file and the JSON Schema; `CHANGELOG.md`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `untrusted-input`: adds the trusted join hosts, which link is the default action, and that the
  host shown is the one opened.
- `configuration`: the printed config and the example show a field's optional values as
  commented-out lines.

## Impact

Changed: `Logic.js` (host parsing, trust check, the `joinHosts` field and its validation, the
first selection, the tooltip text, payload fields, printed config), `Alert.qml` (button label,
"?" and tooltip), a new small component for the "?", `Service.qml` (none beyond the payload),
`tools/shoot-card.sh` (an optional link argument, to photograph an unknown link), docs, tests,
`docs/ominous.example.jsonc` and `docs/ominous.schema.json` (regenerated). Users with a meeting
service outside the default list see Dismiss selected until they add its host.
